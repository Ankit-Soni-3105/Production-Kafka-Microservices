// auth-service/src/kafka/producer.js
import { Kafka } from "kafkajs";
import config from "../config/config.js";

const kafka = new Kafka({
  clientId: "auth-service",
  brokers: [process.env.KAFKA_BROKER],
});

const producer = kafka.producer();

export const connectProducer = async () => {
  await producer.connect();
  console.log("✅ Kafka Producer connected (Auth Service)");
};

export const sendUserEvent = async (eventType, userData) => {
  await producer.send({
    topic: "user-events",
    messages: [
      {
        key: eventType,
        value: JSON.stringify(userData),
      },
    ],
  });
  console.log(`📤 User event produced: ${eventType}`, userData);
};
