import mongoose from "mongoose";
import config from "../config/config.js";

export const connectDB = async () => {
    try {
        await mongoose.connect(config.DB_URI).then(() => {
            console.log("MongoDB connected");
        }).catch((error) => {
            console.error("MongoDB connection error:", error);
        });
    } catch (error) {
        console.error("MongoDB connection error:", error);
    }
};
