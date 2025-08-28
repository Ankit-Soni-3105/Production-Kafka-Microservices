import counterModel from '../models/counter.model.mjs';
import messageModel from '../models/message.model.js';

/**
 * Get next sequence number for a chat (atomic).
 */
export async function getNextSeq(chatId) {
    const res = await counterModel.findOneAndUpdate(
        { _id: chatId },
        { $inc: { seq: 1 } },
        { upsert: true, new: true }
    ).lean();
    return res.seq;
}

/**
 * Persist a message. Use idempotency: if msgId exists, skip (or update).
 * Returns saved doc.
 */
export async function persistMessage(msg) {
    // msg: { msgId, chatId, senderId, text, attachments, metadata }
    // ensure seq assigned
    if (typeof msg.seq !== 'number') {
        msg.seq = await getNextSeq(msg.chatId);
    }

    // upsert using msgId for idempotency
    const saved = await messageModel.findOneAndUpdate(
        { msgId: msg.msgId },
        {
            $setOnInsert: {
                msgId: msg.msgId,
                chatId: msg.chatId,
                senderId: msg.senderId,
                seq: msg.seq,
                text: msg.text || '',
                attachments: msg.attachments || [],
                metadata: msg.metadata || {},
                createdAt: msg.createdAt ? new Date(msg.createdAt) : new Date()
            }
        },
        { upsert: true, new: true }
    );

    return saved;
}
