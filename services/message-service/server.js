// server.js
import http from 'http';
import app from './src/app.js';
import config from './src/config/config.js';
import { connectDB } from './src/db/db.js';
import { connectConsumer } from './src/kafka/kafka.consumer.js';

const PORT = config.PORT;
const server = http.createServer(app);

const startServer = async () => {
    try {
        await connectConsumer();
        await connectDB();
        server.listen(PORT, () => {
            console.log(`🚀 Message Service running on port ${PORT}`);
        });
    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
};

startServer();