import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import authRoute from "./routes/auth.route.js";
import userRoute from "./routes/user.route.js";
// import gigRoutes from "./routes/gig.route.js";
// import conversationRoutes from "./routes/conversation.route.js";
// import messageRoutes from "./routes/message.route.js";
// import orderRoutes from "./routes/order.route.js";
// import reviewRoutes from "./routes/review.route.js";
import cookieParser from "cookie-parser";

const app = express();
dotenv.config();

mongoose.set("strictQuery", true);

const connect = async () => {
  try {
    await mongoose.connect(process.env.MONGO);
    console.log("Connected to database");
  } catch (error) {
    console.log("Error connecting to database: ", error);
  }
};

app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoute);
app.use("/api/user", userRoute);
// app.use("api/gigs", gigRoutes);
// app.use("api/conversations", conversationRoutes);
// app.use("api/messages", messageRoutes);
// app.use("api/orders", orderRoutes);
// app.use("api/reviews", reviewRoutes);

const port = process.env.PORT || 8000;
app.listen(port, () => {
  connect();
  console.log(`Server is running on port ${port}`);
});
