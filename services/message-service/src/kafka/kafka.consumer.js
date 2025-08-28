// message-service/src/kafka/consumer.js
import { Kafka } from "kafkajs";
import { processUserLogin } from "../services/userService.js"; // Custom service to handle login event
import config from "../config/config.js";

const kafka = new Kafka({
    clientId: "message-service",
    brokers: [config.KAFKA_BROKERS || "kafka:29092"], // Match with docker-compose
});

const consumer = kafka.consumer({ groupId: "message-group" });

export const connectConsumer = async () => {
    await consumer.connect();
    console.log("✅ Kafka Consumer connected (Message Service)");
    await consumer.subscribe({ topic: "user-events", fromBeginning: true });
    await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
            const userData = JSON.parse(message.value.toString());
            console.log(`📥 Received user event: ${userData.key}`, userData);
            try {
                await processUserLogin(userData); // Process the login event
            } catch (error) {
                console.error(`Error processing user event: ${error.message}`);
            }
        },
    });
};

export const disconnectConsumer = async () => {
    await consumer.disconnect();
    console.log("🔴 Kafka Consumer disconnected (Message Service)");
};

// Graceful shutdown
process.on("SIGTERM", async () => {
    await disconnectConsumer();
    process.exit(0);
});

process.on("SIGINT", async () => {
    await disconnectConsumer();
    process.exit(0);
});