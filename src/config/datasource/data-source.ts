import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { ENV_TEST } from '../../constants';
dotenv.config();

// execute tests on test database
const dbPortEnvKey =
  process.env.NODE_ENV === ENV_TEST ? 'TYPEORM_PORT_TEST' : 'TYPEORM_PORT';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env[dbPortEnvKey], 10),
  database: process.env.DB_DATABASE,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  synchronize: false,
  entities: [process.env.TYPEORM_ENTITIES],
  migrations: [process.env.TYPEORM_MIGRATIONS],
  logging: process.env.TYPEORM_LOGGING === 'true',
});
