import jwt from "jsonwebtoken";

export function generateTokens(user) {
  const accessToken = jwt.sign(
    { userId: user._id.toString(), role: user.role, email: user.email },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: "15m" }
  );

  const refreshToken = jwt.sign(
    { userId: user._id, role: user.role, email: user.email },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: "7d" }
  );

  return { accessToken, refreshToken };
}
