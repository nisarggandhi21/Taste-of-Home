import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

export const deleteUser = async (req, res) => {
  const user = await User.findById(req.params.id);
  const token = req.cookies.accessToken;
  if (!token) return res.status(401).send("You need to login");

  jwt.verify(token, process.env.JWT_KEY, async (err, payload) => {
    if (payload.id !== user._id.toString()) {
      return res.status(403).send("You can only delete your account");
    }
    await User.findByIdAndDelete(req.params.id);
    res.status(200).send("User deleted");
  });
};
