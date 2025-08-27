import { getCollection } from "../config/database.js";
import { ObjectId } from "mongodb";
import { generateTokens } from "../utils/tokens.js";

export async function upsertUser(req, res) {
  const { email, name, photo, role } = req.body;
  if (!email || !name) {
    return res
      .status(400)
      .send({ success: false, message: "Missing required fields" });
  }
  const usersCollection = getCollection("users");
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
        $setOnInsert: { created_at: now, role },
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
    const response =
      result.upsertedCount > 0
        ? {
            status: 201,
            body: { success: true, message: "User created", inserted: true },
          }
        : {
            status: 200,
            body: { success: true, message: "User updated", inserted: false },
          };
    res
      .cookie("token", accessToken, {
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })
      .cookie("refresh_token", refreshToken, {
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })
      .status(response.status)
      .send(response.body);
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Database error",
      error: error.message,
    });
  }
}

export async function searchUsers(req, res) {
  const { email } = req.query;
  const usersCollection = getCollection("users");
  try {
    const users = await usersCollection
      .find({ email: { $regex: email, $options: "i" } })
      .limit(10)
      .toArray();
    res.send({ success: true, data: users });
  } catch (error) {
    res.status(500).send({ success: false, error: error.message });
  }
}

export async function patchUserRole(req, res) {
  const { id } = req.params;
  const { role } = req.body;
  if (!["admin", "user"].includes(role)) {
    return res.status(400).send({ message: "Invalid role" });
  }
  const usersCollection = getCollection("users");
  try {
    const result = await usersCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { role } }
    );
    res.send({ success: true, result });
  } catch (error) {
    res.status(500).send({ success: false, error: error.message });
  }
}

export async function getUserRole(req, res) {
  const { email } = req.query;
  if (!email) {
    return res
      .status(400)
      .send({ success: false, message: "Email is required" });
  }
  const usersCollection = getCollection("users");
  try {
    const user = await usersCollection.findOne(
      { email },
      { projection: { role: 1 } }
    );
    if (!user) {
      return res
        .status(404)
        .send({ success: false, message: "User not found" });
    }
    res.send({ success: true, role: user.role });
  } catch (error) {
    res
      .status(500)
      .send({ success: false, message: "Server error", error: error.message });
  }
}
