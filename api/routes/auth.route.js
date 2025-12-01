import express from "express";
import { register, login, logout } from "../controllers/auth.controller.js";
import validate from "../middleware/validate.js";
import { registerSchema, loginSchema } from "../schemas/auth.schema.js";

const router = express.Router();

router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.post("/logout", logout);

export default router;
