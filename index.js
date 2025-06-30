require("dotenv").config();
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const stripe = require("stripe")(process.env.STRIPE_PRIVATE_KEY);
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const cors = require("cors");
const port = process.env.PORT || 3000;
const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());

const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { userId: user._id, role: user.role },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: "15m" }
  );

  const refreshToken = jwt.sign(
    { userId: user._id },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: "7d" }
  );

  return { accessToken, refreshToken };
};

const verifyJWT = (req, res, next) => {
  const token = req.cookies?.token;

  if (!token) {
    return res
      .status(401)
      .send({ success: false, message: "Unauthorized: No token" });
  }

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res
        .status(403)
        .send({ success: false, message: "Forbidden: Invalid token" });
    }

    req.user = decoded; // e.g., { userId, role }
    next();
  });
};

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
    const usersCollection = parcelDB.collection("users");
    const ridersCollection = parcelDB.collection("riders");

    app.get("/", (_req, res) => {
      res.send("ProFast Server Running.");
    });

    app.post("/logout", (req, res) => {
      res
        .clearCookie("token", {
          httpOnly: true,
        })
        .clearCookie("refresh_token")
        .send({ success: true, message: "Logged out successfully" });
    });

    app.post("/refresh-token", (req, res) => {
      const refreshToken = req.cookies.refresh_token;

      if (!refreshToken) {
        return res.status(401).send({ message: "Unauthorized" });
      }

      try {
        const decoded = jwt.verify(
          refreshToken,
          process.env.REFRESH_TOKEN_SECRET
        );
        const newAccessToken = jwt.sign(
          { userId: decoded.userId },
          process.env.ACCESS_TOKEN_SECRET,
          { expiresIn: "15m" }
        );

        res.cookie("token", newAccessToken, {
          httpOnly: true,
          maxAge: 15 * 60 * 1000,
        });

        res.send({ success: true });
      } catch (err) {
        return res.status(403).send({ message: "Invalid refresh token" });
      }
    });

    app.post("/users/upsert", async (req, res) => {
      const { email, name, photo, role } = req.body;

      if (!email || !name) {
        return res
          .status(400)
          .send({ success: false, message: "Missing required fields" });
      }

      const now = new Date().toISOString();
      const userData = {
        name,
        email,
        photo: photo || "https://example.com/default-avatar.jpg",
        role,
        last_login: now,
      };

      try {
        const result = await usersCollection.updateOne(
          { email },
          {
            $setOnInsert: {
              created_at: now,
              role,
            },
            $set: {
              name: userData.name,
              photo: userData.photo,
              last_login: userData.last_login,
            },
          },
          { upsert: true }
        );
        const userRecord = await usersCollection.findOne({ email });
        const { accessToken, refreshToken } = generateTokens(userRecord);
        if (result.upsertedCount > 0) {
          res
            .cookie("token", accessToken, {
              httpOnly: true,
              maxAge: 7 * 24 * 60 * 60 * 1000,
            })
            .cookie("refresh_token", refreshToken, {
              httpOnly: true,
              maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
              secure: true,
            })
            .status(201)
            .send({
              success: true,
              message: "User created",
              inserted: true,
            });
        } else {
          res
            .cookie("token", accessToken, {
              httpOnly: true,
              maxAge: 7 * 24 * 60 * 60 * 1000,
            })
            .cookie("refresh_token", refreshToken, {
              httpOnly: true,
              maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
              secure: true,
            })
            .send({
              success: true,
              message: "User updated",
              inserted: false,
            });
        }
      } catch (error) {
        res.status(500).send({
          success: false,
          message: "Database error",
          error: error.message,
        });
      }
    });

    //! Get parcels of current user if user not exist then get all parcel data
    app.get("/parcels", verifyJWT, async (req, res) => {
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

    app.post("/riders", async (req, res) => {
      const rider = req.body;
      const result = await ridersCollection.insertOne(rider);
      res.send(result);
    });

    // GET /riders/pending
    app.get("/riders/pending", async (req, res) => {
      try {
        const pendingRiders = await ridersCollection
          .find({ status: "pending" })
          .toArray();

        res.send({ success: true, data: pendingRiders });
      } catch (error) {
        res.status(500).send({
          success: false,
          message: "Failed to fetch pending riders",
          error: error.message,
        });
      }
    });

    // GET /riders/active
    app.get("/riders/active", async (req, res) => {
      try {
        const activeRiders = await ridersCollection
          .find({ status: "approved" })
          .toArray();
        res.send({ success: true, data: activeRiders });
      } catch (error) {
        res.status(500).send({ success: false, message: "Server error" });
      }
    });

    app.patch("/riders/:id", async (req, res) => {
      const { id } = req.params;
      const updatedFields = req.body;

      try {
        const result = await ridersCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updatedFields }
        );

        res.send({ success: true, result });
      } catch (error) {
        res.status(500).send({ success: false, error: error.message });
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
