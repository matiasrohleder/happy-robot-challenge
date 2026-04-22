import { NextFunction, Request, Response } from "express";

/**
 * Express middleware that validates the x-api-key header
 * against the API_KEY environment variable.
 * Returns 401 Unauthorized if the key is missing or invalid.
 */
export function authMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
): void {
    const apiKey: string | undefined = req.headers["x-api-key"] as
        | string
        | undefined;
    const expectedKey: string | undefined = process.env.API_KEY;

    if (!expectedKey) {
        res.status(500).json({ success: false, message: "Server misconfiguration: API_KEY is not set" });
        return;
    }

    if (!apiKey || apiKey !== expectedKey) {
        res.status(401).json({ success: false, message: "Unauthorized: invalid or missing API key" });
        return;
    }

    next();
}
