import mongoose from "mongoose";

const ReactionSchema = new mongoose.Schema({
    messageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message",
        required: true,
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    emoji: {
        type: String, required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true }
);

ReactionSchema.index({ messageId: 1, userId: 1 }, { unique: true });

const reactionModel = mongoose.model("reaction", ReactionSchema);

export default reactionModel;
