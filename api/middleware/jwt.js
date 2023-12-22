import jwt from "jsonwebtoken";
import createError from "../utils/createError.js";

export const verifyToken = (req, res, next) => {
  const token = req.cookies.accessToken;
  if (!token) next(createError(401, "Access denied!"));
  jwt.verify(token, process.env.JWT_KEY, async (err, payload) => {
    if (err) next(createError(403, "Invalid token!"));
    req.userId = payload.id;
    req.isSeller = payload.isSeller;
    next();
  });
};
