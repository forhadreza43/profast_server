require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_PRIVATE_KEY);
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const cors = require("cors");
const port = process.env.PORT || 3000;
const app = express();

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@crudcluster.buy7rkc.mongodb.net/?retryWrites=true&w=majority&appName=crudCluster`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const parcelDB = client.db("parcelDB");
    const parcelCollection = parcelDB.collection("parcels");
    const paymentCollection = parcelDB.collection("payments");
    app.get("/", (_req, res) => {
      res.send("ProFast Server Running.");
    });

    //! Get parcels of current user if user not exist then get all parcel data
    app.get("/parcels", async (req, res) => {
      const userEmail = req.query.email;
      let query = {};
      if (userEmail) {
        query.user_email = userEmail;
      }

      try {
        const parcels = await parcelCollection
          .find(query)
          .sort({ creation_date: -1 }) // Sort by newest first
          .toArray();
        res.send(parcels);
      } catch (err) {
        res.status(500).send({ error: "Failed to fetch parcels" });
      }
    });

    //! Get parcel by user
    app.get("/parcels/:tracking_id", async (req, res) => {
      const tracking_id = req.params.tracking_id;

      try {
        const result = await parcelCollection.findOne({ tracking_id });
        res.send(result);
      } catch (error) {
        res.status(404).send({ success: false, message: "Parcel not found" });
      }
    });

    //! Delete parcel by user
    app.delete("/parcels/:tracking_id", async (req, res) => {
      const tracking_id = req.params.tracking_id;

      const result = await parcelCollection.deleteOne({ tracking_id });

      if (result.deletedCount > 0) {
        res.send({ success: true, message: "Parcel deleted" });
      } else {
        res.status(404).send({ success: false, message: "Parcel not found" });
      }
    });

    //! update paid status after paid
    app.patch("/parcels/:tracking_id", async (req, res) => {
      const tracking_id = req.params.tracking_id;
      const updateData = req.body;

      const result = await parcelCollection.updateOne(
        { tracking_id },
        { $set: updateData }
      );

      if (result.modifiedCount > 0) {
        res.send({ success: true, message: "Parcel updated" });
      } else {
        res.status(404).send({
          success: false,
          message: "Parcel not found or no change made",
        });
      }
    });

    //! Add parcel to database
    app.post("/parcels", async (req, res) => {
      const newParcel = req.body;
      const result = await parcelCollection.insertOne(newParcel);
      res.status(201).send(result);
    });

    //!Payment
    app.post("/create-payment-intent", async (req, res) => {
      try {
        const { amount } = req.body;

        const paymentIntent = await stripe.paymentIntents.create({
          amount: amount * 100, // Stripe expects amounts in cents
          currency: "usd",
        });

        res.json({ clientSecret: paymentIntent.client_secret });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    //! Pay and Save Payment History at once
    app.post("/payments/complete", async (req, res) => {
      const parcel = req.body;
      const tracking_id = parcel.tracking_id;

      try {
        // 1. Update parcel status to paid
        const updateResult = await parcelCollection.updateOne(
          { tracking_id },
          { $set: { payment_status: "paid" } }
        );

        if (updateResult.modifiedCount === 0) {
          return res.status(404).send({
            success: false,
            message: "Parcel not found or already paid",
          });
        }
        const paymentData = {
          ...parcel,
          paid_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        };

        const paymentResult = await paymentCollection.insertOne(paymentData);

        res.status(201).send({
          success: true,
          message: "Payment completed and history saved",
          paymentId: paymentResult.insertedId,
        });
      } catch (error) {
        res.status(500).send({ success: false, error: error.message });
      }
    });

    //! Get payment history (user-specific or admin)
    app.get("/payments", async (req, res) => {
      const userEmail = req.query.email;
      let query = {};
      if (userEmail) {
        query.user_email = userEmail;
      }

      try {
        const payments = await paymentCollection
          .find(query)
          .sort({ paid_at: -1 }) // Show latest first
          .toArray();
        res.send(payments);
      } catch (error) {
        res.status(500).send({ error: "Failed to fetch payment history" });
      }
    });
  } finally {
    // Ensures that the client will close when you finish/error
    app.listen(port, () => {
      console.log(`Example app listening on port ${port}`);
    });
  }
}
run().catch(console.dir);
