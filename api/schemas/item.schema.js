import { z } from "zod";

export const createItemSchema = z.object({
  body: z.object({
    title: z.string({ required_error: "Title is required" }).min(1, "Title cannot be empty"),
    desc: z.string({ required_error: "Description is required" }).min(10, "Description must be at least 10 characters long"),
    cat: z.string({ required_error: "Category is required" }),
    price: z.number({ required_error: "Price is required" }).positive("Price must be a positive number"),
    cover: z.string({ required_error: "Cover image is required" }).url("Cover must be a valid URL"),
    images: z.array(z.string().url("Image must be a valid URL")).optional(),
    shortTitle: z.string({ required_error: "Short title is required" }).max(50, "Short title must be under 50 characters"),
    shortDesc: z.string({ required_error: "Short description is required" }).max(100, "Short description must be under 100 characters"),
    deliveryTime: z.number({ required_error: "Delivery time is required" }).int().positive("Delivery time must be a positive integer"),
    features: z.array(z.string()).optional(),
  }),
});
