export function toStringOrEmpty(value: unknown): string {
    return typeof value === "string" ? value.trim() : "";
}

export function toStringOrNull(value: unknown): string | null {
    const normalized: string = toStringOrEmpty(value);
    return normalized || null;
}

export function toNumberOrNull(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }

    if (typeof value === "string") {
        const trimmed: string = value.trim();
        if (!trimmed) {
            return null;
        }
        const parsed: number = Number(trimmed.replace(/[$,]/g, ""));
        return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
}

export function toIsoTimestampOrNow(value: unknown): string {
    if (typeof value === "string") {
        const date: Date = new Date(value);
        if (!Number.isNaN(date.getTime())) {
            return date.toISOString();
        }
    }

    return new Date().toISOString();
}
