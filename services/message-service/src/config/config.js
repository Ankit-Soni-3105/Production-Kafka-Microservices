import 'dotenv/config'

const _config = {
  PORT: process.env.PORT,
  DB_URI: process.env.DB_URI,
  KAFKA_BROKERS: process.env.KAFKA_BROKERS || 'localhost:9092',
};

const config = Object.freeze(_config);

export default config;
