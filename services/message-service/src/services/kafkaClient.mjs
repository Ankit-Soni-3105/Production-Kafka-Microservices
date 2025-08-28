import { Kafka } from 'kafkajs';
import pino from 'pino';

const log = pino({ level: process.env.LOG_LEVEL || 'info' });

const brokers = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');

const kafka = new Kafka({
    clientId: process.env.KAFKA_CLIENT_ID || 'message-service',
    brokers
});

export function createProducer() {
    return kafka.producer();
}

export function createConsumer(groupId) {
    return kafka.consumer({ 
        groupId: groupId || process.env.KAFKA_GROUP_ID || 'message-service-consumer' 
    });
}

export { kafka, log };
