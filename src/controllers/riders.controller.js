import { ObjectId } from "mongodb";
import { getCollection } from "../config/database.js";

export async function createRider(req, res) {
  const rider = req.body;
  const result = await getCollection("riders").insertOne(rider);
  res.send(result);
}

export async function getRidersByRegion(req, res) {
  const { region } = req.params;
  try {
    const riders = await getCollection("riders")
      .find({ region, status: "approved" })
      .toArray();
    res.send({ success: true, data: riders });
  } catch (error) {
    res.status(500).send({ success: false, error: error.message });
  }
}

export async function getPendingRiders(_req, res) {
  try {
    const pendingRiders = await getCollection("riders")
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
}

export async function getActiveRiders(_req, res) {
  try {
    const activeRiders = await getCollection("riders")
      .find({ status: "approved" })
      .toArray();
    res.send({ success: true, data: activeRiders });
  } catch (error) {
    res.status(500).send({ success: false, message: "Server error" });
  }
}

export async function updateRiderStatus(req, res) {
  const { id } = req.params;
  const { status, email } = req.body;
  try {
    const riderUpdate = await getCollection("riders").updateOne(
      { _id: new ObjectId(id) },
      { $set: { status } }
    );
    let roleUpdate = null;
    if (status === "approved") {
      roleUpdate = await getCollection("users").updateOne(
        { email },
        { $set: { role: "rider" } }
      );
    }
    res.send({ success: true, riderUpdate, roleUpdate });
  } catch (error) {
    res.status(500).send({ success: false, error: error.message });
  }
}
