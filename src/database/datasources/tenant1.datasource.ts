import * as dotenv from 'dotenv';
import { commonDSConfig } from './commonDSConfig';
import { DataSource } from 'typeorm';
dotenv.config();

export default new DataSource({
  name: 'tenant1',
  type: 'postgres',
  host: process.env['DB_TENANT1_HOST'],
  port: parseInt(process.env['DB_TENANT1_PORT'], 10),
  database: process.env['DB_TENANT1_DATABASE'],
  username: process.env['DB_TENANT1_USERNAME'],
  password: process.env['DB_TENANT1_PASSWORD'],
  ...commonDSConfig,
});
