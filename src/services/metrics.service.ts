import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

const DATA_DIR: string = process.env.RAILWAY_VOLUME_MOUNT_PATH
    ? join(process.env.RAILWAY_VOLUME_MOUNT_PATH, "metrics")
    : join(__dirname, "../../data");
const DATA_FILE: string = join(DATA_DIR, "metrics.json");

export interface CallMetric {
    call_id: string;
    mc_number: string | null;
    carrier_sentiment: string;
    call_outcome: string;
    negotiation_rounds: number;
    final_rate: number | null;
    call_duration_seconds: number | null;
    equipment_type: string | null;
    load_id: string | null;
    classification: string | null;
    timestamp: string;
}

/**
 * Loads all persisted call metrics from disk.
 */
export async function loadMetrics(): Promise<CallMetric[]> {
    try {
        const raw: string = await readFile(DATA_FILE, "utf-8");
        const parsed: unknown = JSON.parse(raw);

        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed as CallMetric[];
    } catch (error: unknown) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
            return [];
        }
        return [];
    }
}

/**
 * Persists the full metrics array to disk.
 */
export async function saveMetrics(metrics: CallMetric[]): Promise<void> {
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(DATA_FILE, JSON.stringify(metrics, null, 2), "utf-8");
}
