import * as dotenv from 'dotenv';
import { ENV_TEST } from '../constants';
dotenv.config();

export const redisConfig = {
  redis: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    db: process.env.NODE_ENV === ENV_TEST ? 1 : 0,
  },
};
