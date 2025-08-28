// server.js
import http from 'http';
import { Server } from 'socket.io';
import app from './src/app.js';
import config from './src/config/config.js';
import { connectDB } from './src/db/db.js';
import { disconnectKafka, initKafkaConsumer, initKafkaProducer, producer } from './src/kafka/kafka.js';

const PORT = config.PORT;

// 1. Connect to MongoDB
connectDB();

// 2. Create HTTP server
const server = http.createServer(app);

// 3. Setup Socket.IO for real-time messages
const io = new Server(server, {
    cors: {
        origin: "*", // In prod, set this to your domain
        methods: ["GET", "POST"]
    }
});

(async () => {
    const producerOK = await initKafkaProducer();
    const consumerOK = await initKafkaConsumer(io);

    if (!producerOK || !consumerOK) {
        console.error('❌ Kafka is not available. Check your broker settings.');
        // Optional: process.exit(1); // Exit if Kafka is required for startup
    }
})();

// 5. Socket.IO connection handler
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on('sendMessage', async (msgData) => {
        try {
            // Send to Kafka for processing
            await producer.send({
                topic: process.env.KAFKA_TOPIC_INBOUND || 'chat-messages',
                messages: [{ value: JSON.stringify(msgData) }]
            });
            console.log('📤 Message sent to Kafka:', msgData);
        } catch (err) {
            console.error('❌ Kafka send error:', err.message);
        }
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
    });
});

// 6. Start server
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});

// 7. Graceful shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down gracefully...');
    await disconnectKafka();
    server.close(() => process.exit(0));
});
