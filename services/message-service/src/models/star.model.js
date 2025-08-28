import mongoose from "mongoose";

const StarSchema = new mongoose.Schema({//Bookmarks
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
    createdAt: {
        type: Date, default: Date.now
    }
}, { timestamps: true }
);

StarSchema.index({ messageId: 1, userId: 1 }, { unique: true });

const starModel = mongoose.model("star", StarSchema);

export default starModel;
