import Redis from "ioredis";
import Message from "../models/message.model.js";
import { publish } from "../kafka/kafka.js";

const redis = new Redis(process.env.REDIS_URL);

export const scheduleTTL = (messageId, when) => {
    const key = `ttl:${messageId}`;     
    const ms = new Date(when).getTime() - Date.now();
    if (ms > 0) redis.set(key, "1", "PX", ms);
};

// Simple polling keyspace events alternative:
(async function subscribeTTL() {
    // Enable notify-keyspace-events "Ex" in redis if needed.
    const sub = new Redis(process.env.REDIS_URL);
    await sub.psubscribe("__keyevent@0__:expired");
    sub.on("pmessage", async (_, __, key) => {
        if (!key.startsWith("ttl:")) return;
        const messageId = key.split(":")[1];
        const msg = await Message.findById(messageId);
        if (msg && !msg.deletedAt) {
            msg.deletedAt = new Date();
            await msg.save();
            await publish("messages.deleted", { messageId, scope: "ttl" });
        }
    });
})();
