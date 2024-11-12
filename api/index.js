import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";

const app = express();

mongoose.set("strictQuery", true);

const connect = async () => {
  try {
    await mongoose.connect(process.env.MONGO);
    console.log("Connected to database");
  } catch (error) {
    console.log("Error connecting to database: ", error);
  }
};

// Middleware
app.use(cors());
app.use(express.json());

// Basic route
app.get("/", (req, res) => {
  res.json({ message: "Welcome to the API" });
});

// Set port and start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  connect();
  console.log(`Server is running on port ${PORT}`);
});
