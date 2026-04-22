import { randomUUID } from "crypto";
import { Request, Response, Router } from "express";
import { CallMetric, loadMetrics, saveMetrics } from "../services/metrics.service";
import { toNumberOrNull, toStringOrEmpty, toStringOrNull } from "../utils/normalize";

/**
 * In-memory store for call dashboard metrics, hydrated from disk on startup.
 */
export const callMetricsStore: CallMetric[] = [];

export async function initializeMetricsStore(): Promise<void> {
    const persistedMetrics: CallMetric[] = await loadMetrics();
    callMetricsStore.splice(0, callMetricsStore.length, ...persistedMetrics);
}

const router: Router = Router();

interface ExtractedVariables {
    mc_number: string | null;
    carrier_sentiment: string;
    call_outcome: string;
    negotiation_rounds: number;
    final_rate: number | null;
    call_duration_seconds: number | null;
    equipment_type: string | null;
    load_id: string | null;
    classification: string | null;
}

function hasAnyExpectedField(source: Record<string, unknown>): boolean {
    const expectedFields: string[] = [
        "mc_number",
        "carrier_sentiment",
        "call_outcome",
        "negotiation_rounds",
        "final_rate",
        "call_duration_seconds",
        "equipment_type",
        "load_id",
        "classification",
    ];

    return expectedFields.some((field: string) => source[field] !== undefined);
}

function extractVariablesFromPayload(body: unknown): ExtractedVariables | null {
    if (!body || typeof body !== "object") {
        return null;
    }

    const payload: Record<string, unknown> = body as Record<string, unknown>;

    const nested: unknown = payload.extracted_variables;
    const classifierResponse: unknown = payload.response;
    const source: Record<string, unknown> =
        nested && typeof nested === "object"
            ? (nested as Record<string, unknown>)
            : classifierResponse && typeof classifierResponse === "object"
                ? (classifierResponse as Record<string, unknown>)
                : payload;

    if (!hasAnyExpectedField(source)) {
        return null;
    }

    return {
        mc_number: toStringOrNull(source.mc_number),
        carrier_sentiment: toStringOrEmpty(source.carrier_sentiment) || "Unknown",
        call_outcome: toStringOrEmpty(source.call_outcome) || "Unknown",
        negotiation_rounds: toNumberOrNull(source.negotiation_rounds) ?? 0,
        final_rate: toNumberOrNull(source.final_rate),
        call_duration_seconds: toNumberOrNull(source.call_duration_seconds),
        equipment_type: toStringOrNull(source.equipment_type),
        load_id: toStringOrNull(source.load_id),
        classification: toStringOrNull(source.classification),
    };
}

/**
 * POST /api/webhook
 * Receives all-call data from the AI agent and stores it for dashboard consumption.
 */
router.post("/", async (req: Request, res: Response): Promise<void> => {
    if (!req.is("application/json")) {
        res.status(415).json({ success: false, message: "Content-Type must be application/json" });
        return;
    }

    const extractedVariables: ExtractedVariables | null = extractVariablesFromPayload(req.body);

    if (!extractedVariables) {
        res.status(200).json({ success: true, message: "Webhook received, no data to process" });
        return;
    }

    const metric: CallMetric = {
        call_id: randomUUID(),
        mc_number: extractedVariables.mc_number,
        carrier_sentiment: extractedVariables.carrier_sentiment,
        call_outcome: extractedVariables.call_outcome,
        negotiation_rounds: extractedVariables.negotiation_rounds,
        final_rate: extractedVariables.final_rate,
        call_duration_seconds: extractedVariables.call_duration_seconds,
        equipment_type: extractedVariables.equipment_type,
        load_id: extractedVariables.load_id,
        classification: extractedVariables.classification,
        timestamp: new Date().toISOString(),
    };

    callMetricsStore.push(metric);
    try {
        await saveMetrics(callMetricsStore);
    } catch {
        res.status(500).json({ success: false, message: "Failed to persist metrics" });
        return;
    }

    res.status(200).json({ success: true, message: "Webhook received", call_id: metric.call_id });
});

export default router;
