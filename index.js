import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { initDatabase } from "./src/config/database.js";
import authRoutes from "./src/routes/auth.routes.js";
import userRoutes from "./src/routes/users.routes.js";
import parcelRoutes from "./src/routes/parcels.routes.js";
import riderRoutes from "./src/routes/riders.routes.js";
import paymentRoutes from "./src/routes/payments.routes.js";

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

app.get("/", (_req, res) => {
  res.send("ProFast Server Running.");
});

app.use("/", authRoutes);
app.use("/", userRoutes);
app.use("/", parcelRoutes);
app.use("/", riderRoutes);
app.use("/", paymentRoutes);

initDatabase()
  .then(() => {
    app.listen(port, () => {
      console.log(`Example app listening on port ${port}`);
    });
  })
  .catch((err) => {
    console.error("Failed to initialize database", err);
    process.exit(1);
  });
