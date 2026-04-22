import { Request, Response, Router } from "express";
import { loads } from "../data/loads.data";

const router: Router = Router();

/**
 * GET /api/loads/search
 * Searches the in-memory load database by equipment_type and origin_state query params.
 * Requires equipment_type and origin_state query params.
 */
router.get("/search", (req: Request, res: Response): void => {
    const equipmentTypeParam: unknown = req.query.equipment_type;
    const originStateParam: unknown = req.query.origin_state;

    if (!equipmentTypeParam) {
        res.status(400).json({
            success: false,
            message: "equipment_type is required",
        });
        return;
    }

    if (typeof equipmentTypeParam !== "string") {
        res.status(400).json({
            success: false,
            message: "equipment_type must be a string",
        });
        return;
    }

    if (typeof originStateParam !== "string") {
        res.status(400).json({
            success: false,
            message: "origin_state is required",
        });
        return;
    }

    const equipment_type: string = equipmentTypeParam;
    const origin_state: string = originStateParam;

    if (!origin_state.trim()) {
        res.status(400).json({
            success: false,
            message: "origin_state is required",
        });
        return;
    }

    const normalizedType: string = equipment_type.trim().toLowerCase();
    const normalizedState: string = origin_state.trim().toUpperCase();

    const results = loads.filter((load) => {
        const typeMatch: boolean =
            load.equipment_type.toLowerCase() === normalizedType;
        const stateMatch: boolean = load.origin
            .toUpperCase()
            .includes(`, ${normalizedState}`);
        return typeMatch && stateMatch;
    });

    res.json({ success: true, data: results });
});

export default router;
