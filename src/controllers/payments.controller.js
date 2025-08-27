import Stripe from "stripe";
import { getCollection } from "../config/database.js";
const stripe = new Stripe(process.env.STRIPE_PRIVATE_KEY);

export async function createPaymentIntent(req, res) {
  try {
    const { amount } = req.body;
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100,
      currency: "usd",
    });
    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function completePayment(req, res) {
  const parcel = req.body;
  const tracking_id = parcel.tracking_id;
  try {
    const updateResult = await getCollection("parcels").updateOne(
      { tracking_id },
      { $set: { payment_status: "paid" } }
    );
    if (updateResult.modifiedCount === 0) {
      return res
        .status(404)
        .send({ success: false, message: "Parcel not found or already paid" });
    }
    const paymentData = {
      ...parcel,
      paid_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    const paymentResult = await getCollection("payments").insertOne(
      paymentData
    );
    res.status(201).send({
      success: true,
      message: "Payment completed and history saved",
      paymentId: paymentResult.insertedId,
    });
  } catch (error) {
    res.status(500).send({ success: false, error: error.message });
  }
}

export async function listPayments(req, res) {
  const userEmail = req.query.email;
  let query = {};
  if (userEmail) {
    query.user_email = userEmail;
  }
  try {
    const payments = await getCollection("payments")
      .find(query)
      .sort({ paid_at: -1 })
      .toArray();
    res.send(payments);
  } catch (error) {
    res.status(500).send({ error: "Failed to fetch payment history" });
  }
}
