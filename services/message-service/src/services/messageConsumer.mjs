import { createConsumer, log } from './kafkaClient.mjs';
import { persistMessage } from './messagePersistence.mjs';
import { producePersistedMessage, startProducer } from './messageProducer.mjs';

let consumer;

export async function startConsumer() {
    consumer = createConsumer();
    await consumer.connect();
    const topic = process.env.KAFKA_TOPIC_INBOUND || 'chat.messages';
    await consumer.subscribe({ topic, fromBeginning: false });

    // ensure producer ready for publishing persisted events
    await startProducer();

    await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
            try {
                const payload = JSON.parse(message.value.toString());
                // expected payload: { msgId, chatId, senderId, text, attachments, metadata, createdAt, seq? }
                const saved = await persistMessage(payload);

                // emit persisted event (authoritative)
                await producePersistedMessage({
                    msgId: saved.msgId,
                    chatId: saved.chatId,
                    senderId: saved.senderId,
                    seq: saved.seq,
                    createdAt: saved.createdAt,
                    status: saved.status
                });
                log.info(`Persisted message ${saved.msgId} seq=${saved.seq}`);
            } catch (err) {
                log.error({ err }, 'Error processing inbound message');
                // depending on policy: throw to let kafka retry, or swallow & DLQ
            }
        }
    });
}
