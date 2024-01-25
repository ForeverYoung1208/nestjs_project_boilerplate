import * as dotenv from 'dotenv';
import { ENV_TEST } from '../../constants';
dotenv.config();

export const commonDSConfig = {
  synchronize: false,
  migrations: ['dist/DB/migrations/**/*.js'],
  logging: process.env.TYPEORM_LOGGING === 'true',
  entities:
    process.env.NODE_ENV === ENV_TEST
      ? ['src/entities/**/*entity.ts']
      : ['dist/entities/**/*entity.js'],
};
