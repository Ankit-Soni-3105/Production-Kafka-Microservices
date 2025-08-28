import { createProducer, log } from './kafkaClient.mjs';

let producer;

export async function startProducer() {
    producer = createProducer();
    await producer.connect();
    log.info('Kafka producer connected');
}

export async function producePersistedMessage(event) {
    // event is an object; serialize
    const topic = process.env.KAFKA_TOPIC_PERSISTED || 'chat.message.persisted';
    await producer.send({
        topic,
        messages: [{ 
            key: event.chatId, 
            value: JSON.stringify(event) 
        }]
    });
}
