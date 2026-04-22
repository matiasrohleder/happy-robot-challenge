import { randomUUID } from "crypto";
import { Request, Response, Router } from "express";
import { CallMetric, saveMetrics } from "../services/metrics.service";
import { toIsoTimestampOrNow, toNumberOrNull, toStringOrNull } from "../utils/normalize";
import { callMetricsStore } from "./webhook.router";

const router: Router = Router();

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

/**
 * GET /api/metrics
 * Returns all stored call metrics for the frontend dashboard.
 */
router.get("/", (_req: Request, res: Response) => {
    res.json({ success: true, data: callMetricsStore });
});

/**
 * DELETE /api/metrics/:call_id
 * Deletes a single metric record by call_id.
 */
router.delete("/:call_id", async (req: Request, res: Response): Promise<void> => {
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
router.delete("/", async (_req: Request, res: Response): Promise<void> => {
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
router.post("/bulk", async (req: Request, res: Response): Promise<void> => {
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

export default router;
