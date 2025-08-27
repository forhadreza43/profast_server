import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";
import { getCollection } from "../config/database.js";

export function verifyJWT(req, res, next) {
  const token = req.cookies?.token;
  if (!token) {
    return res
      .status(401)
      .send({ success: false, message: "Unauthorized: No token" });
  }

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err?.name === "TokenExpiredError") {
      return res.status(401).send({ success: false, message: "Token Expired" });
    }
    if (err) {
      return res
        .status(403)
        .send({ success: false, message: "Forbidden: Invalid token" });
    }
    req.user = decoded;
    next();
  });
}

export async function verifyAdmin(req, res, next) {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).send({ success: false, message: "Unauthorized" });
  }
  try {
    const usersCollection = getCollection("users");
    const user = await usersCollection.findOne({
      _id: new ObjectId(String(userId)),
    });
    if (!user || user.role !== "admin") {
      return res
        .status(403)
        .send({ success: false, message: "Forbidden: Admins only" });
    }
    next();
  } catch (error) {
    return res
      .status(500)
      .send({ success: false, message: "Server error", error: error.message });
  }
}
