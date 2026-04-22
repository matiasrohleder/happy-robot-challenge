import dotenv from "dotenv";
dotenv.config();

import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import { readFileSync } from "fs";
import path from "path";
import { authMiddleware } from "./middleware/auth.middleware";
import carrierRouter from "./routes/carrier.router";
import loadsRouter from "./routes/loads.router";
import metricsRouter from "./routes/metrics.router";
import webhookRouter, { initializeMetricsStore } from "./routes/webhook.router";

const app = express();
const PORT: number = Number(process.env.PORT) || 3000;

function getAppVersion(): string {
    try {
        const packageJsonPath: string = path.resolve(__dirname, "..", "package.json");
        const packageJsonRaw: string = readFileSync(packageJsonPath, "utf8");
        const packageJson: Record<string, unknown> = JSON.parse(packageJsonRaw) as Record<string, unknown>;
        const version: unknown = packageJson.version;
        return typeof version === "string" ? version : "unknown";
    } catch {
        return "unknown";
    }
}

const APP_VERSION: string = getAppVersion();

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
app.use("/api/metrics", metricsRouter);

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
