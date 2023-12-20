import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { ENV_TEST } from '../../constants';
dotenv.config();

// execute tests on test database
const dbPortEnvKey =
  process.env.NODE_ENV === ENV_TEST ? 'DB_PORT_TEST' : 'DB_PORT';

export const appDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env[dbPortEnvKey], 10),
  database: process.env.DB_DATABASE,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  synchronize: false,
  entities: ['dist/entities/**/*entity.js'],
  migrations: ['dist/DB/migrations/**/*.js'],
  logging: process.env.TYPEORM_LOGGING === 'true',
});
