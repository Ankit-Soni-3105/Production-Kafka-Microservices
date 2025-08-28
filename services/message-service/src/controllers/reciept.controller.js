import MessageReceipt from "../models/receiveMessage.model.js";
import { publish } from "../kafka/kafka.js";

export const updateReceipt = async (req, res) => {
    try {
        const { messageId } = req.params;
        const { status } = req.body; // "delivered" | "read"
        
        const now = new Date();

        const update = { status };
        if (status === "delivered") update.deliveredAt = now;
        if (status === "read") update.readAt = now;

        const doc = await MessageReceipt.findOneAndUpdate(
            { messageId, userId: req.user.id },
            { $set: update },
            { upsert: true, new: true }
        );
        await publish("receipts.updated", { messageId, userId: req.user.id, status });
        res.json(doc);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
};
