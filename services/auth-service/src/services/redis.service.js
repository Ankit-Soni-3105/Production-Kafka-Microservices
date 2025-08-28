import redis from 'ioredis';
import config from '../config/config.js';

const redisClient = new redis({
    host: config.REDIS_HOST,
    port: config.REDIS_PORT,
    password: config.REDIS_PASSWORD
});
redisClient.on('connect', () => {
    console.log('Connected to Redis');
});

redisClient.on('error', (err) => {
    console.error('Redis error:', err);
});
    
export default redisClient;
