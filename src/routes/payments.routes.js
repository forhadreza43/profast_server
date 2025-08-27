import express from "express";
import {
  createPaymentIntent,
  completePayment,
  listPayments,
} from "../controllers/payments.controller.js";

const router = express.Router();

router.post("/create-payment-intent", createPaymentIntent);
router.post("/payments/complete", completePayment);
router.get("/payments", listPayments);

export default router;
