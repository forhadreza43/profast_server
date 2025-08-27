import express from "express";
import jwt from "jsonwebtoken";
const router = express.Router();

router.post("/logout", (req, res) => {
  res
    .clearCookie("token", { httpOnly: true })
    .clearCookie("refresh_token")
    .send({ success: true, message: "Logged out successfully" });
});

router.post("/refresh-token", (req, res) => {
  const refreshToken = req.cookies.refresh_token;
  if (!refreshToken) {
    return res.status(401).send({ message: "Unauthorized" });
  }
  try {
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
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
  } catch (_err) {
    return res.status(403).send({ message: "Invalid refresh token" });
  }
});

export default router;
