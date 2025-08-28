import mongoose from "mongoose";

const editSchema = new mongoose.Schema({
    editorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true
    },
    oldContent: {
        type: String
    },
    newContent: {
        type: String
    },
    editedAt: {
        type: Date,
        default: Date.now
    }
},
    {
        timestamps: true,
        _id: false
    }
);

const messageSchema = new mongoose.Schema({
    chatId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "chat", 
        index: true,
        required: true
    },
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        index: true,
        required: true
    },
    messageType: {
        type: String,
        enum: ["text", "image", "file", "audio", "video", "location", "system"],
        default: "text"
    },// type of message
    content: {
        type: String
    },                    // text or caption
    attachments: [{
        url: String,
        mime: String,
        size: Number,
        meta: Object
    }],// attachments of message
    replyTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "message", 
        default: null
    }, // threading of replies
    forwardOf: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "message", 
        default: null
    }, // forwarding
    meta: {
        // any preserved metadata when forwarding
        originalSenderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "user"
        },// original sender
        originalChatId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "chat"
        }
    },
    edits: {
        type: [editSchema],
        default: []
    },   // edit history
    deletedAt: {
        type: Date,
        default: null
    },     // soft delete (server) means the message will be deleted from the server
    localDeletedFor: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "user"
    }], // local delete per user means the message will be deleted for these users because they have opted to delete it
    ttlExpiresAt: {
        type: Date,
        index: true,
        default: null
    }, // it is the time-to-live expiration means the message will be deleted after this date
    reactionsCount: {
        type: Number,
        default: 0
    },
    seenBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "user"
    }], // users who have seen the message
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
},
    { timestamps: true }
);

const messageModel = mongoose.model("message", messageSchema);

export default messageModel;