import dotenv from "dotenv";
dotenv.config();

import cors from "cors";
import { randomUUID } from "crypto";
import express, { NextFunction, Request, Response } from "express";
import { APP_VERSION } from "./config/version";
import { authMiddleware } from "./middleware/auth.middleware";
import carrierRouter from "./routes/carrier.router";
import loadsRouter from "./routes/loads.router";
import webhookRouter, { callMetricsStore, initializeMetricsStore } from "./routes/webhook.router";
import { CallMetric, saveMetrics } from "./services/metrics.service";
import { toIsoTimestampOrNow, toNumberOrNull, toStringOrNull } from "./utils/normalize";

const app = express();
const PORT: number = Number(process.env.PORT) || 3000;

type MetricSeed = Partial<CallMetric> & Record<string, unknown>;

function normalizeMetricSeed(seed: MetricSeed): CallMetric {
    return {
        call_id: toStringOrNull(seed.call_id) || randomUUID(),
        mc_number: toStringOrNull(seed.mc_number),
        carrier_sentiment: toStringOrNull(seed.carrier_sentiment) || "Unknown",
        call_outcome: toStringOrNull(seed.call_outcome) || "Unknown",
        negotiation_rounds: toNumberOrNull(seed.negotiation_rounds) ?? 0,
        final_rate: toNumberOrNull(seed.final_rate),
        call_duration_seconds: toNumberOrNull(seed.call_duration_seconds),
        equipment_type: toStringOrNull(seed.equipment_type),
        load_id: toStringOrNull(seed.load_id),
        classification: toStringOrNull(seed.classification),
        timestamp: toIsoTimestampOrNow(seed.timestamp),
    };
}

app.use(cors());
app.use(express.json({ limit: "256kb" }));
app.set("trust proxy", true);

app.get("/", (_req: Request, res: Response) => {
    res.json({ success: true, service: "mcbot", version: APP_VERSION });
});

app.get("/health", (_req: Request, res: Response) => {
    res.json({ success: true, message: "Server is running" });
});

app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ success: true, message: "Server is running" });
});

app.get("/version", (_req: Request, res: Response) => {
    res.json({ success: true, version: APP_VERSION });
});

app.use("/api", authMiddleware);

app.use("/api/loads", loadsRouter);
app.use("/api/carrier", carrierRouter);
app.use("/api/webhook", webhookRouter);

/**
 * GET /api/metrics
 * Returns all stored call metrics for the frontend dashboard.
 */
app.get("/api/metrics", (_req: Request, res: Response) => {
    res.json({ success: true, data: callMetricsStore });
});

/**
 * DELETE /api/metrics/:call_id
 * Deletes a single metric record by call_id.
 */
app.delete("/api/metrics/:call_id", async (req: Request, res: Response): Promise<void> => {
    const callIdParam: string | string[] = req.params.call_id;
    const callId: string = Array.isArray(callIdParam) ? callIdParam[0] : callIdParam;

    if (!callId) {
        res.status(400).json({ success: false, message: "call_id is required" });
        return;
    }

    const index: number = callMetricsStore.findIndex((metric: CallMetric) => metric.call_id === callId);

    if (index === -1) {
        res.status(404).json({ success: false, message: "Metric not found" });
        return;
    }

    const deleted: CallMetric[] = callMetricsStore.splice(index, 1);
    try {
        await saveMetrics(callMetricsStore);
    } catch {
        res.status(500).json({ success: false, message: "Failed to persist metrics" });
        return;
    }

    res.status(200).json({ success: true, data: deleted[0] });
});

/**
 * DELETE /api/metrics
 * Deletes all stored metrics for full reset scenarios.
 */
app.delete("/api/metrics", async (_req: Request, res: Response): Promise<void> => {
    const deletedCount: number = callMetricsStore.length;
    callMetricsStore.splice(0, callMetricsStore.length);
    try {
        await saveMetrics(callMetricsStore);
    } catch {
        res.status(500).json({ success: false, message: "Failed to persist metrics" });
        return;
    }

    res.status(200).json({
        success: true,
        message: "All metrics were deleted",
        deleted: deletedCount,
        total: callMetricsStore.length,
    });
});

/**
 * POST /api/metrics/bulk
 * Imports an array of metric JSON objects to seed mock data.
 */
app.post("/api/metrics/bulk", async (req: Request, res: Response): Promise<void> => {
    const payload: unknown = req.body;
    const incoming: unknown =
        Array.isArray(payload)
            ? payload
            : payload && typeof payload === "object"
                ? (payload as Record<string, unknown>).metrics
                : null;

    if (!Array.isArray(incoming) || incoming.length === 0) {
        res.status(400).json({
            success: false,
            message: "Request body must be a non-empty array or { metrics: [...] }",
        });
        return;
    }

    const normalized: CallMetric[] = incoming
        .filter((item: unknown) => Boolean(item) && typeof item === "object")
        .map((item: unknown) => normalizeMetricSeed(item as MetricSeed));

    if (normalized.length === 0) {
        res.status(400).json({ success: false, message: "No valid metric objects were provided" });
        return;
    }

    callMetricsStore.push(...normalized);
    try {
        await saveMetrics(callMetricsStore);
    } catch {
        res.status(500).json({ success: false, message: "Failed to persist metrics" });
        return;
    }

    res.status(200).json({
        success: true,
        imported: normalized.length,
        total: callMetricsStore.length,
    });
});

app.use((_req: Request, res: Response) => {
    res.status(404).json({ success: false, message: "Resource not found" });
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    void err;
    res.status(500).json({ success: false, message: "Internal server error" });
});

async function bootstrap(): Promise<void> {
    await initializeMetricsStore();
    app.listen(PORT);
}

void bootstrap();
