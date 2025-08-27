import express from "express";
import { verifyJWT, verifyAdmin } from "../middleware/auth.js";
import {
  listParcels,
  listPendingPaidParcels,
  completeDelivery,
  assignRider,
  getRiderCompletedParcels,
  getRiderAssignedParcels,
  getParcelByTracking,
  deleteParcelByTracking,
  updateParcelByTracking,
  createParcel,
} from "../controllers/parcels.controller.js";

const router = express.Router();

router.get("/parcels", verifyJWT, listParcels);
router.get(
  "/parcels/pending-paid",
  verifyJWT,
  verifyAdmin,
  listPendingPaidParcels
);
router.get("/parcels/completed", verifyJWT, getRiderCompletedParcels);
router.get("/parcels/rider-assigned", verifyJWT, getRiderAssignedParcels);
router.get("/parcels/:tracking_id", getParcelByTracking);
router.delete("/parcels/:tracking_id", deleteParcelByTracking);
router.patch("/parcels/:tracking_id", updateParcelByTracking);
router.patch("/parcels/:id/complete-delivery", completeDelivery);
router.patch("/parcels/:id/assign-rider", assignRider);
router.post("/parcels", createParcel);

export default router;
