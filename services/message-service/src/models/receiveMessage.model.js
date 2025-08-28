import mongoose from "mongoose";

const ReceiptSchema = new mongoose.Schema({
    messageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "message",
        index: true,
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        index: true,
        required: true
    },
    status: {
        type: String,
        enum: ["sent", "delivered", "seen", "read"],
        default: "sent", 
        index: true
    },// status of the message receipt means it is delivered or read or seen or 
    sentAt: {
        type: Date, 
        default: Date.now
    },
    deliveredAt: {
        type: Date
    },
    readAt: {
        type: Date
    }
},
    { timestamps: true }
);

ReceiptSchema.index({ messageId: 1, userId: 1 }, { unique: true });

const receiptModel = mongoose.model("receiptModel", ReceiptSchema);

export default receiptModel;
