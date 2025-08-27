import express from "express";
import { verifyJWT, verifyAdmin } from "../middleware/auth.js";
import {
  upsertUser,
  searchUsers,
  patchUserRole,
  getUserRole,
} from "../controllers/users.controller.js";

const router = express.Router();

router.post("/users/upsert", upsertUser);
router.get("/users/search", verifyJWT, verifyAdmin, searchUsers);
router.patch("/users/:id/role", verifyJWT, verifyAdmin, patchUserRole);
router.get("/users/role", verifyJWT, getUserRole);

export default router;
