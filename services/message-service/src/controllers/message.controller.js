import messageModel from "../models/message.model.js";
import receiptModel from "../models/receiveMessage.model.js";
import { publish } from "../kafka/kafka.js";
import { scheduleTTL } from "../utils/ttl.js";

export const sendMessages = async (req, res) => {
    try {
        const { chatId, messageType = "text", content, attachments = [], replyTo, ttlSeconds } = req.body;
        // const senderId = req.user.id || "";
        const senderId = "67fe252e70762ae6d482e4d9";
        const msg = await messageModel.create({
            chatId,
            senderId,
            messageType,
            content,
            attachments,
            replyTo,
            ttlExpiresAt: ttlSeconds ? new Date(Date.now() + ttlSeconds * 1000) : null // Set TTL expiration
        });
        // Init receipts for each chat member is usually done in chat-service -> fan-out
        await publish("messages.created", {
            messageId: msg._id.toString(),
            chatId,
            senderId
        });

        if (msg.ttlExpiresAt) scheduleTTL(msg._id, msg.ttlExpiresAt);

        return res.status(201).json(msg);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

export const editMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const { newContent } = req.body;
        const userId = req.user.id || "";

        const msg = await messageModel.findById(messageId);

        if (!msg)
            return res.status(404).json({ message: "Not found" });

        if (msg.senderId.toString() !== userId)
            return res.status(403).json({ message: "Forbidden" });

        msg.edits.push({
            editorId: userId,
            oldContent: msg.content,
            newContent
        });
        msg.content = newContent;

        await msg.save();
        await publish("messages.edited", {
            messageId,
            editorId: userId
        });
        return res.status(200).json({
            messageId,
            editorId: userId
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

export const deleteMessageSoft = async (req, res) => {
    try {
        const { messageId } = req.params;
        const { scope = "server" } = req.query; // server | local
        const userId = req.user.id || "";

        const msg = await messageModel.findById(messageId);

        if (!msg) return res.status(404).json({ message: "Not found" });

        if (scope === "server") {
            if (msg.senderId.toString() !== userId)
                return res.status(403).json({ message: "Forbidden" });

            msg.deletedAt = new Date();
            await msg.save();
            await publish("messages.deleted", {
                messageId, scope: "server"
            });
        } else {
            // local delete for current user
            msg.localDeletedFor.push(userId);
            await msg.save();
            await publish("messages.deleted", {
                messageId,
                scope: "local",
                userId
            });
        }
        return res.status(200).json({
            messageId,
            scope
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

export const forwardMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const { targetChatId } = req.body;
        const senderId = req.user.id || "";

        const src = await messageModel.findById(messageId);

        if (!src)
            return res.status(404).json({ message: "Source not found" });

        const fwd = await messageModel.create({
            chatId: targetChatId,
            senderId,
            type: src.type,
            content: src.content,
            attachments: src.attachments,
            forwardOf: src._id,
            meta: {
                originalSenderId: src.senderId,
                originalChatId: src.chatId
            }
        });
        await publish("messages.forwarded", {
            messageId: fwd._id.toString(),
            from: src._id.toString(),
            targetChatId
        });
        return res.status(201).json({ fwd });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

export const getThread = async (req, res) => {
    try {
        const { rootMessageId } = req.params;

        const msgs = await messageModel.find({
            $or: [
                { _id: rootMessageId },
                { replyTo: rootMessageId }
            ]
        })
            .sort({ createdAt: 1 });
        return res.json(msgs);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

export const replyMessage = async (req, res) => {
    try {
        const { rootMessageId } = req.params;
        const { content, attachments = [] } = req.body;
        const senderId = req.user.id || "";

        const root = await Message.findById(rootMessageId);

        if (!root)
            return res.status(404).json({ message: "Root not found" });

        const msg = await messageModel.create({
            chatId: root.chatId,
            senderId,
            content,
            attachments,
            replyTo: root._id
        });
        await publish("messages.created", {
            messageId: msg._id.toString(),
            chatId: msg.chatId,
            replyTo: root._id.toString()
        });

        return res.status(201).json({ msg });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

export const listMessages = async (req, res) => {
    try {
        const { chatId } = req.params;
        const { before, limit = 30 } = req.query;

        const q = { chatId, deletedAt: null };

        if (before)
            q.createdAt = { $lt: new Date(before) };

        const items = await messageModel.find(q).sort({ createdAt: -1 }).limit(Number(limit));

        return res.status(200).json(items.reverse());
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};







// import Message, { MessageHelpers, MessageLocalDelete } from "../models/message.model.js";
// import receiptModel from "../models/receiveMessage.model.js";
// import { publish } from "../kafka/kafka.js";
// import { scheduleTTL } from "../utils/ttl.js";

// export const sendMessages = async (req, res) => {
//     try {
//         const {
//             chatId,
//             messageType = "text",
//             content,
//             attachments = [],
//             replyTo,
//             ttlSeconds,
//             priority = "normal"
//         } = req.body;

//         // const senderId = req.user.id || "";
//         const senderId = "67fe252e70762ae6d482e4d9";

//         // Validate required fields based on message type
//         if (messageType === "text" && (!content || content.trim().length === 0)) {
//             return res.status(400).json({ message: "Text messages must have content" });
//         }

//         if (['image', 'file', 'audio', 'video'].includes(messageType) && attachments.length === 0) {
//             return res.status(400).json({
//                 // message: ${ messageType } messages must have attachments
//                 errors: [
//                     {
//                         message: `${messageType} messages must have attachments`,
//                         field: "attachments"
//                     }
//                 ]
//             });
//     }

//         const msg = await Message.create({
//         chatId,
//         senderId,
//         messageType,
//         content: content?.trim(),
//         attachments,
//         replyTo,
//         priority,
//         ttlExpiresAt: ttlSeconds ? new Date(Date.now() + ttlSeconds * 1000) : null,
//         status: "sent"
//     });

//     // Publish message creation event
//     await publish("messages.created", {
//         messageId: msg._id.toString(),
//         chatId,
//         senderId,
//         messageType,
//         priority
//     });

//     // Schedule TTL cleanup if needed
//     if (msg.ttlExpiresAt) {
//         scheduleTTL(msg._id, msg.ttlExpiresAt);
//     }

//     return res.status(201).json({
//         success: true,
//         data: msg
//     });
// } catch (error) {
//     console.error("Error sending message:", error);

//     // Handle validation errors
//     if (error.name === 'ValidationError') {
//         return res.status(400).json({
//             message: "Validation Error",
//             errors: Object.values(error.errors).map(e => e.message)
//         });
//     }

//     return res.status(500).json({ message: "Internal Server Error" });
// }
// };

// export const editMessage = async (req, res) => {
//     try {
//         const { messageId } = req.params;
//         const { newContent } = req.body;
//         const userId = req.user?.id || "";

//         if (!newContent || newContent.trim().length === 0) {
//             return res.status(400).json({ message: "New content is required" });
//         }

//         const msg = await Message.findById(messageId);

//         if (!msg) {
//             return res.status(404).json({ message: "Message not found" });
//         }

//         if (msg.senderId.toString() !== userId) {
//             return res.status(403).json({ message: "Forbidden: You can only edit your own messages" });
//         }

//         // Check if message is too old to edit (optional business rule)
//         const editTimeLimit = 24 * 60 * 60 * 1000; // 24 hours
//         if (Date.now() - msg.createdAt.getTime() > editTimeLimit) {
//             return res.status(403).json({ message: "Message is too old to edit" });
//         }

//         // Add to edit history
//         msg.edits.push({
//             editorId: userId,
//             oldContent: msg.content,
//             newContent: newContent.trim()
//         });

//         msg.content = newContent.trim();
//         msg.updatedAt = new Date();

//         await msg.save();

//         // Publish edit event
//         await publish("messages.edited", {
//             messageId,
//             editorId: userId,
//             newContent: newContent.trim(),
//             editCount: msg.edits.length
//         });

//         return res.status(200).json({
//             success: true,
//             data: {
//                 messageId,
//                 editorId: userId,
//                 newContent: msg.content,
//                 editedAt: msg.edits[msg.edits.length - 1].editedAt,
//                 editCount: msg.edits.length
//             }
//         });
//     } catch (error) {
//         console.error("Error editing message:", error);
//         return res.status(500).json({ message: "Internal Server Error" });
//     }
// };

// export const deleteMessageSoft = async (req, res) => {
//     try {
//         const { messageId } = req.params;
//         const { scope = "server" } = req.query; // server | local
//         const userId = req.user?.id || "";

//         const msg = await Message.findById(messageId);

//         if (!msg) {
//             return res.status(404).json({ message: "Message not found" });
//         }

//         if (scope === "server") {
//             // Server-side deletion (soft delete)
//             if (msg.senderId.toString() !== userId) {
//                 return res.status(403).json({
//                     message: "Forbidden: You can only delete your own messages"
//                 });
//             }

//             msg.deletedAt = new Date();
//             await msg.save();

//             await publish("messages.deleted", {
//                 messageId,
//                 scope: "server",
//                 deletedBy: userId
//             });
//         } else {
//             // Local deletion for current user using separate collection
//             const success = await MessageHelpers.localDeleteForUser(messageId, userId);

//             if (!success) {
//                 return res.status(500).json({ message: "Failed to delete message locally" });
//             }

//             await publish("messages.deleted", {
//                 messageId,
//                 scope: "local",
//                 userId
//             });
//         }

//         return res.status(200).json({
//             success: true,
//             data: {
//                 messageId,
//                 scope,
//                 deletedBy: userId
//             }
//         });
//     } catch (error) {
//         console.error("Error deleting message:", error);
//         return res.status(500).json({ message: "Internal Server Error" });
//     }
// };

// export const forwardMessage = async (req, res) => {
//     try {
//         const { messageId } = req.params;
//         const { targetChatId, content: additionalContent } = req.body;
//         const senderId = req.user?.id || "";

//         if (!targetChatId) {
//             return res.status(400).json({ message: "Target chat ID is required" });
//         }

//         const sourceMsg = await Message.findById(messageId);

//         if (!sourceMsg) {
//             return res.status(404).json({ message: "Source message not found" });
//         }

//         // Check if message is visible to the user
//         const isVisible = await sourceMsg.isVisibleToUser(senderId);
//         if (!isVisible) {
//             return res.status(404).json({ message: "Source message not found" });
//         }

//         // Create forwarded message
//         const forwardedMsg = await Message.create({
//             chatId: targetChatId,
//             senderId,
//             messageType: sourceMsg.messageType,
//             content: additionalContent || sourceMsg.content, // Allow additional content
//             attachments: sourceMsg.attachments,
//             forwardOf: sourceMsg._id,
//             originalSenderId: sourceMsg.originalSenderId || sourceMsg.senderId,
//             originalChatId: sourceMsg.originalChatId || sourceMsg.chatId,
//             status: "sent"
//         });

//         await publish("messages.forwarded", {
//             messageId: forwardedMsg._id.toString(),
//             originalMessageId: sourceMsg._id.toString(),
//             targetChatId,
//             forwardedBy: senderId
//         });

//         return res.status(201).json({
//             success: true,
//             data: forwardedMsg
//         });
//     } catch (error) {
//         console.error("Error forwarding message:", error);
//         return res.status(500).json({ message: "Internal Server Error" });
//     }
// };

// export const getThread = async (req, res) => {
//     try {
//         const { rootMessageId } = req.params;
//         const { limit = 50 } = req.query;
//         const userId = req.user?.id || "";

//         // First check if root message exists and is visible
//         const rootMsg = await Message.findById(rootMessageId);
//         if (!rootMsg) {
//             return res.status(404).json({ message: "Root message not found" });
//         }

//         const isVisible = await rootMsg.isVisibleToUser(userId);
//         if (!isVisible) {
//             return res.status(404).json({ message: "Root message not found" });
//         }

//         // Get all messages in the thread
//         const msgs = await Message.find({
//             $or: [
//                 { _id: rootMessageId },
//                 { replyTo: rootMessageId }
//             ],
//             deletedAt: null
//         })
//             .sort({ createdAt: 1 })
//             .limit(Number(limit))
//             .populate('senderId', 'name avatar isOnline')
//             .lean();

//         // Filter out messages that are locally deleted for this user
//         const locallyDeleted = await MessageLocalDelete.find({ userId }).distinct('messageId');
//         const visibleMsgs = msgs.filter(msg =>
//             !locallyDeleted.some(deletedId => deletedId.toString() === msg._id.toString())
//         );

//         return res.status(200).json({
//             success: true,
//             data: {
//                 rootMessageId,
//                 messages: visibleMsgs,
//                 totalCount: visibleMsgs.length
//             }
//         });
//     } catch (error) {
//         console.error("Error getting thread:", error);
//         return res.status(500).json({ message: "Internal Server Error" });
//     }
// };

// export const replyMessage = async (req, res) => {
//     try {
//         const { rootMessageId } = req.params;
//         const { content, attachments = [], messageType = "text" } = req.body;
//         const senderId = req.user?.id || "";

//         const rootMsg = await Message.findById(rootMessageId);

//         if (!rootMsg) {
//             return res.status(404).json({ message: "Root message not found" });
//         }

//         // Check if root message is visible to user
//         const isVisible = await rootMsg.isVisibleToUser(senderId);
//         if (!isVisible) {
//             return res.status(404).json({ message: "Root message not found" });
//         }

//         // Validate content based on message type
//         if (messageType === "text" && (!content || content.trim().length === 0)) {
//             return res.status(400).json({ message: "Text messages must have content" });
//         }

//         const replyMsg = await Message.create({
//             chatId: rootMsg.chatId,
//             senderId,
//             messageType,
//             content: content?.trim(),
//             attachments,
//             replyTo: rootMsg._id,
//             status: "sent"
//         });

//         await publish("messages.created", {
//             messageId: replyMsg._id.toString(),
//             chatId: replyMsg.chatId,
//             senderId,
//             replyTo: rootMsg._id.toString(),
//             isReply: true
//         });

//         return res.status(201).json({
//             success: true,
//             data: replyMsg
//         });
//     } catch (error) {
//         console.error("Error replying to message:", error);
//         return res.status(500).json({ message: "Internal Server Error" });
//     }
// };

// export const listMessages = async (req, res) => {
//     try {
//         const { chatId } = req.params;
//         const { before, limit = 30, messageType } = req.query;
//         const userId = req.user?.id || "";

//         // Use the optimized static method
//         const messages = await Message.findActiveMessages(
//             chatId,
//             Number(limit),
//             before ? new Date(before) : null
//         );

//         // Filter out messages that are locally deleted for this user
//         const locallyDeleted = await MessageLocalDelete.find({ userId }).distinct('messageId');
//         const visibleMessages = messages.filter(msg =>
//             !locallyDeleted.some(deletedId => deletedId.toString() === msg._id.toString())
//         );

//         // Additional filtering by message type if requested
//         let filteredMessages = visibleMessages;
//         if (messageType) {
//             filteredMessages = visibleMessages.filter(msg => msg.messageType === messageType);
//         }

//         return res.status(200).json({
//             success: true,
//             data: {
//                 messages: filteredMessages.reverse(), // Reverse for chronological order
//                 chatId,
//                 hasMore: filteredMessages.length === Number(limit),
//                 count: filteredMessages.length
//             }
//         });
//     } catch (error) {
//         console.error("Error listing messages:", error);
//         return res.status(500).json({ message: "Internal Server Error" });
//     }
// };

// // New endpoint: Mark message as seen
// export const markMessageAsSeen = async (req, res) => {
//     try {
//         const { messageId } = req.params;
//         const userId = req.user?.id || "";

//         const success = await MessageHelpers.markAsSeen(messageId, userId);

//         if (!success) {
//             return res.status(500).json({ message: "Failed to mark message as seen" });
//         }

//         await publish("messages.seen", {
//             messageId,
//             userId,
//             seenAt: new Date()
//         });

//         return res.status(200).json({
//             success: true,
//             data: {
//                 messageId,
//                 userId,
//                 seenAt: new Date()
//             }
//         });
//     } catch (error) {
//         console.error("Error marking message as seen:", error);
//         return res.status(500).json({ message: "Internal Server Error" });
//     }
// };

// // New endpoint: Add reaction to message
// export const addReaction = async (req, res) => {
//     try {
//         const { messageId } = req.params;
//         const { emoji } = req.body;
//         const userId = req.user?.id || "";

//         if (!emoji || emoji.trim().length === 0) {
//             return res.status(400).json({ message: "Emoji is required" });
//         }

//         const success = await MessageHelpers.addReaction(messageId, userId, emoji.trim());

//         if (!success) {
//             return res.status(500).json({ message: "Failed to add reaction" });
//         }

//         await publish("messages.reaction_added", {
//             messageId,
//             userId,
//             emoji: emoji.trim()
//         });

//         return res.status(200).json({
//             success: true,
//             data: {
//                 messageId,
//                 userId,
//                 emoji: emoji.trim()
//             }
//         });
//     } catch (error) {
//         console.error("Error adding reaction:", error);
//         return res.status(500).json({ message: "Internal Server Error" });
//     }
// };

// // New endpoint: Get message reactions
// export const getMessageReactions = async (req, res) => {
//     try {
//         const { messageId } = req.params;

//         const reactions = await MessageHelpers.getMessageReactions(messageId);

//         return res.status(200).json({
//             success: true,
//             data: {
//                 messageId,
//                 reactions
//             }
//         });
//     } catch (error) {
//         console.error("Error getting message reactions:", error);
//         return res.status(500).json({ message: "Internal Server Error" });
//     }
// };

// // New endpoint: Get unread message count
// export const getUnreadCount = async (req, res) => {
//     try {
//         const { chatId } = req.params;
//         const { lastSeenMessageId } = req.query;
//         const userId = req.user?.id || "";

//         const unreadCount = await MessageHelpers.getUnreadCount(chatId, userId, lastSeenMessageId);

//         return res.status(200).json({
//             success: true,
//             data: {
//                 chatId,
//                 userId,
//                 unreadCount
//             }
//         });
//     } catch (error) {
//         console.error("Error getting unread count:", error);
//         return res.status(500).json({ message: "Internal Server Error" });
//     }
// };