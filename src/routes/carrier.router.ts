import { Request, Response, Router } from "express";
import { verifyCarrierEligibility } from "../services/fmcsa.service";

const router: Router = Router();

/**
 * GET /api/carrier/verify
 * Receives an MC number from query params and checks carrier eligibility via the FMCSA API.
 * Requires mc_number query param.
 */
router.get("/verify", async (req: Request, res: Response): Promise<void> => {
    const mcNumberParam: unknown = req.query.mc_number;

    if (!mcNumberParam) {
        res.status(400).json({
            success: false,
            message: "mc_number is required",
        });
        return;
    }

    if (typeof mcNumberParam !== "string") {
        res.status(400).json({
            success: false,
            message: "mc_number must be a string",
        });
        return;
    }

    const mc_number: string = mcNumberParam;

    try {
        const eligible: boolean = await verifyCarrierEligibility(mc_number);
        res.json({ success: true, eligible });
    } catch (error: unknown) {
        const message: string =
            error instanceof Error ? error.message : "Unknown error";
        res.status(502).json({ success: false, message });
    }
});

export default router;
