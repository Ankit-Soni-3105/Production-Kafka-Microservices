import Reaction from "../models/reaction.model.js";
import Message from "../models/message.model.js";
import { publish } from "../kafka/kafka.js";

export const addReaction = async (req, res) => {
    try {
        const { messageId } = req.params;
        const { emoji } = req.body;
        const userId = req.user.id || "";

        const doc = await Reaction.findOneAndUpdate(
            { messageId, userId },
            { $set: { emoji } },
            { upsert: true, new: true }
        );
        await Message.updateOne({ _id: messageId }, { $inc: { reactionsCount: 1 } });
        await publish("messages.reacted", {
            messageId,
            userId,
            emoji
        });
        res.status(201).json({ doc });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

export const removeReaction = async (req, res) => {
    try {
        const { messageId } = req.params;
        const userId = req.user.id || "";

        const removed = await Reaction.findOneAndDelete({ messageId, userId });

        if (removed) await Message.updateOne(
            {
                _id: messageId
            },
            {
                $inc: { reactionsCount: -1 }
            }
        );

        await publish("messages.reacted", {
            messageId,
            userId,
            emoji: null
        });
        res.status(200).json({ message: "Reaction removed successfully", removed });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};
