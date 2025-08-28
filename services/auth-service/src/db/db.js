import mongoose from 'mongoose';
import config from '../config/config.js';

export function connectDB() {
    mongoose.connect(config.MONGO_URI).then(() => {
        console.log('MongoDB connected successfully');
    }).catch((error) => {
        console.error('MongoDB connection error:', error);
    });
}
