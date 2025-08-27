import { ObjectId } from "mongodb";
import { getCollection } from "../config/database.js";

export async function listParcels(req, res) {
  const userEmail = req.query.email;
  let query = {};
  if (userEmail) {
    query.user_email = userEmail;
  }
  try {
    const parcels = await getCollection("parcels")
      .find(query)
      .sort({ creation_date: -1 })
      .toArray();
    res.send(parcels);
  } catch (err) {
    res.status(500).send({ error: "Failed to fetch parcels" });
  }
}

export async function listPendingPaidParcels(_req, res) {
  try {
    const parcels = await getCollection("parcels")
      .find({ delivery_status: "pending", payment_status: "paid" })
      .sort({ creation_date: -1 })
      .toArray();
    res.send(parcels);
  } catch (error) {
    res.status(500).send({ success: false, message: error.message });
  }
}

export async function completeDelivery(req, res) {
  try {
    const id = req.params.id;
    const result = await getCollection("parcels").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          delivery_status: "delivered",
          delivered_at: new Date().toISOString(),
        },
      }
    );
    res.send({ success: true, result });
  } catch (error) {
    res.status(500).send({ success: false, error: error.message });
  }
}

export async function assignRider(req, res) {
  const { id } = req.params;
  const { riderEmail } = req.body;
  try {
    const result = await getCollection("parcels").updateOne(
      { _id: new ObjectId(id) },
      { $set: { assigned_rider: riderEmail, delivery_status: "assigned" } }
    );
    res.send({ success: true, result });
  } catch (err) {
    res.status(500).send({ success: false, error: err.message });
  }
}

export async function getRiderCompletedParcels(req, res) {
  const email = req.query.email;
  try {
    const parcels = await getCollection("parcels")
      .find({ assigned_rider: email, delivery_status: "delivered" })
      .sort({ delivered_at: -1 })
      .toArray();
    res.send(parcels);
  } catch (error) {
    res.status(500).send({ success: false, error: error.message });
  }
}

export async function getRiderAssignedParcels(req, res) {
  const email = req.query.email;
  try {
    const parcels = await getCollection("parcels")
      .find({
        assigned_rider: email,
        delivery_status: "assigned",
        payment_status: "paid",
      })
      .toArray();
    res.send(parcels);
  } catch (error) {
    res.status(500).send({ message: "Error fetching assigned parcels" });
  }
}

export async function getParcelByTracking(req, res) {
  const tracking_id = req.params.tracking_id;
  try {
    const result = await getCollection("parcels").findOne({ tracking_id });
    res.send(result);
  } catch (error) {
    res.status(404).send({ success: false, message: "Parcel not found" });
  }
}

export async function deleteParcelByTracking(req, res) {
  const tracking_id = req.params.tracking_id;
  const result = await getCollection("parcels").deleteOne({ tracking_id });
  if (result.deletedCount > 0) {
    res.send({ success: true, message: "Parcel deleted" });
  } else {
    res.status(404).send({ success: false, message: "Parcel not found" });
  }
}

export async function updateParcelByTracking(req, res) {
  const tracking_id = req.params.tracking_id;
  const updateData = req.body;
  const result = await getCollection("parcels").updateOne(
    { tracking_id },
    { $set: updateData }
  );
  if (result.modifiedCount > 0) {
    res.send({ success: true, message: "Parcel updated" });
  } else {
    res
      .status(404)
      .send({ success: false, message: "Parcel not found or no change made" });
  }
}

export async function createParcel(req, res) {
  const newParcel = req.body;
  const result = await getCollection("parcels").insertOne(newParcel);
  res.status(201).send(result);
}
