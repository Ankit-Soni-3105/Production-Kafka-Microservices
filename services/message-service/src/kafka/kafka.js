// src/services/kafka.js
import { Kafka, logLevel } from 'kafkajs';

const broker =
    process.env.KAFKA_BROKERS?.includes("kafka")
        ? process.env.KAFKA_BROKERS        // inside Docker: kafka:9092
        : "localhost:9092";                // default for local dev

// ==== YOUR ORIGINAL CONFIG (unchanged) ====
const kafka = new Kafka({
    clientId: process.env.KAFKA_CLIENT_ID || 'chat-app',
    brokers: [broker],
    logLevel: logLevel.INFO,
    createPartitioner: Partitioners.LegacyPartitioner, // silence partitioner warning
});

export const producer = kafka.producer();
export const consumer = kafka.consumer({
    groupId: process.env.KAFKA_GROUP_ID || 'chat-group'
});

export const initKafkaProducer = async () => {
    try {
        console.log(`🔄 Connecting to Kafka at: ${process.env.KAFKA_BROKERS || 'kafka:9092'}`);
        await producer.connect();
        console.log('✅ Kafka Producer connected');
        return true;
    } catch (err) {
        console.error('❌ Kafka Producer connection error:', err.message);
        return false;
    }
};

export const initKafkaConsumer = async (io) => {
    try {
        await consumer.connect();
        console.log('✅ Kafka Consumer connected');

        const topic = process.env.KAFKA_TOPIC_INBOUND || 'chat-messages';
        await consumer.subscribe({ topic, fromBeginning: false });

        const batchSize = parseInt(process.env.KAFKA_CONSUMER_BATCH_SIZE || '1', 10);
        const concurrency = parseInt(process.env.KAFKA_CONSUMER_CONCURRENCY || '1', 10);

        await consumer.run({
            // keep it simple & safe; one-at-a-time in-order per partition by default
            eachMessage: async ({ topic, partition, message, heartbeat, pause }) => {
                try {
                    const raw = message.value?.toString() || '{}';
                    const msg = JSON.parse(raw);

                    // Emit to socket room; unchanged from your logic
                    io.to(msg.roomId).emit('newMessage', msg);

                    // Heartbeat to keep the session alive in slow handlers
                    await heartbeat().catch(() => { });
                    if (process.env.NODE_ENV !== 'production') {
                        console.log(`📨 [${topic}/${partition}] offset=${message.offset}`, msg);
                    }
                } catch (err) {
                    console.error('❌ Error processing message:', err);
                    // Send to DLQ to avoid losing messages
                    await safeSendDLQ(message).catch(e => console.error('❌ DLQ failed:', e));
                }
            },
        });

        return true;
    } catch (err) {
        console.error('❌ Kafka Consumer connection error:', err.message);
        return false;
    }
};

// Graceful shutdown
export const disconnectKafka = async () => {
    try {
        await producer.disconnect();
        await consumer.disconnect();
        console.log('✅ Kafka disconnected gracefully');
    } catch (err) {
        console.error('❌ Error disconnecting Kafka:', err);
    }
};

// ==== ADDITIONS BELOW (helpers; non-breaking) ====

// Ensure a topic exists (idempotent). Use at app boot if needed.
export const ensureTopic = async (topic, numPartitions = 3, replicationFactor = 1) => {
    const admin = kafka.admin();
    await admin.connect();
    try {
        const topics = await admin.listTopics();
        if (!topics.includes(topic)) {
            await admin.createTopics({
                waitForLeaders: true,
                topics: [{ topic, numPartitions, replicationFactor }]
            });
            console.log(`✅ Created topic: ${topic}`);
        } else {
            console.log(`ℹ️ Topic exists: ${topic}`);
        }
    } finally {
        await admin.disconnect();
    }
};

// Keyed producer for stable partitioning (e.g., by chatId)
export const sendMessage = async ({
    topic = process.env.KAFKA_TOPIC_PERSISTED || 'chat.message.persisted',
    key, // e.g., chatId
    value, // JS object
    headers = {}
}) => {
    if (!value || typeof value !== 'object') {
        throw new Error('sendMessage requires a JSON object in "value"');
    }
    const payload = {
        topic,
        messages: [{
            key: key ? String(key) : undefined,
            value: JSON.stringify(value),
            headers
        }],
        compression: 1 // GZIP
    };
    await producer.send(payload);
    if (process.env.NODE_ENV !== 'production') {
        console.log(`📤 Produced -> ${topic}`, { key, value });
    }
};

export const publish = async (topic, message) => {
    try {
        if (!producer) throw new Error('Kafka producer not initialized');
        await producer.send({
            topic,
            messages: [{ value: JSON.stringify(message) }]
        });
        console.log(`📤 Published to ${topic}:`, message);
    } catch (err) {
        console.error(`❌ Failed to publish to ${topic}:`, err.message);
    }
};

// Safe DLQ sender used when consumer fails to process a message
const safeSendDLQ = async (message) => {
    const dlq = process.env.KAFKA_TOPIC_DLX || 'chat.messages.dlq';
    const headers = {};
    if (message.headers) {
        for (const k of Object.keys(message.headers)) {
            headers[k] = message.headers[k]?.toString();
        }
    }
    await producer.send({
        topic: dlq,
        messages: [{
            key: message.key?.toString(),
            value: message.value?.toString(),
            headers: { ...headers, 'x-error-ts': Date.now().toString() }
        }]
    });
    console.log(`🚨 Sent message to DLQ: ${dlq}`);
};

// Optional: call this at boot to guarantee topics (safe with kafka-init too)
export const ensureCoreTopics = async () => {
    const inbound = process.env.KAFKA_TOPIC_INBOUND || 'chat.messages';
    const persisted = process.env.KAFKA_TOPIC_PERSISTED || 'chat.message.persisted';
    const dlq = process.env.KAFKA_TOPIC_DLX || 'chat.messages.dlq';
    await ensureTopic(inbound, 3, 1);
    await ensureTopic(persisted, 3, 1);
    await ensureTopic(dlq, 3, 1);
};

// Attach process signals once (call from your server bootstrap)
let _signalsAttached = false;
export const attachKafkaSignalHandlers = () => {
    if (_signalsAttached) return;
    _signalsAttached = true;
    const shutdown = async (sig) => {
        console.log(`\n🛑 Caught ${sig}, closing Kafka...`);
        await disconnectKafka();
        process.exit(0);
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
};

// Optional robust init (retry/backoff) you can use in your server start
export const initKafkaWithRetry = async ({ io, retries = 5, delayMs = 2000 } = {}) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
        const okProd = await initKafkaProducer();
        const okCons = await initKafkaConsumer(io);
        if (okProd && okCons) {
            console.log('✅ Kafka ready');
            return true;
        }
        console.warn(`⚠️ Kafka init failed (attempt ${attempt}/${retries}). Retrying in ${delayMs}ms...`);
        await new Promise(r => setTimeout(r, delayMs));
    }
    throw new Error('Kafka init failed after retries');
};







// // src/services/kafka.js
// import { Kafka } from 'kafkajs';

// const kafka = new Kafka({
//     clientId: process.env.KAFKA_CLIENT_ID || 'chat-app',
//     brokers: [process.env.KAFKA_BROKERS || 'kafka:9092'],
// });

// export const producer = kafka.producer();
// export const consumer = kafka.consumer({
//     groupId: process.env.KAFKA_GROUP_ID || 'chat-group'
// });

// export const initKafkaProducer = async () => {
//     try {
//         console.log(`🔄 Connecting to Kafka at: ${process.env.KAFKA_BROKERS || 'kafka:9092'}`);
//         await producer.connect();
//         console.log('✅ Kafka Producer connected');
//         return true;
//     } catch (err) {
//         console.error('❌ Kafka Producer connection error:', err.message);
//         return false;
//     }
// };

// export const initKafkaConsumer = async (io) => {
//     try {
//         await consumer.connect();
//         console.log('✅ Kafka Consumer connected');

//         const topic = process.env.KAFKA_TOPIC_INBOUND || 'chat-messages';
//         await consumer.subscribe({ topic, fromBeginning: false });

//         await consumer.run({
//             eachMessage: async ({ message }) => {
//                 try {
//                     const msg = JSON.parse(message.value.toString());
//                     io.to(msg.roomId).emit('newMessage', msg);
//                     console.log('📨 Message processed:', msg);
//                 } catch (parseError) {
//                     console.error('❌ Error parsing message:', parseError);
//                 }
//             },
//         });

//         return true;
//     } catch (err) {
//         console.error('❌ Kafka Consumer connection error:', err.message);
//         return false;
//     }
// };

// // Graceful shutdown
// export const disconnectKafka = async () => {
//     try {
//         await producer.disconnect();
//         await consumer.disconnect();
//         console.log('✅ Kafka disconnected gracefully');
//     } catch (err) {
//         console.error('❌ Error disconnecting Kafka:', err);
//     }
// };