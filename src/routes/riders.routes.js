import express from "express";
import { verifyJWT } from "../middleware/auth.js";
import {
  createRider,
  getRidersByRegion,
  getPendingRiders,
  getActiveRiders,
  updateRiderStatus,
} from "../controllers/riders.controller.js";

const router = express.Router();

router.post("/riders", createRider);
router.get("/riders/by-region/:region", getRidersByRegion);
router.get("/riders/pending", verifyJWT, getPendingRiders);
router.get("/riders/active", verifyJWT, getActiveRiders);
router.patch("/riders/:id", verifyJWT, updateRiderStatus);

export default router;
