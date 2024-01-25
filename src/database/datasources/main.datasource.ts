import * as dotenv from 'dotenv';
import { commonDSConfig } from './commonDSConfig';
import { DataSource } from 'typeorm';
dotenv.config();

export default new DataSource({
  name: 'main',
  type: 'postgres',
  host: process.env['DB_MAIN_HOST'],
  port: parseInt(process.env['DB_MAIN_PORT'], 10),
  database: process.env['DB_MAIN_DATABASE'],
  username: process.env['DB_MAIN_USERNAME'],
  password: process.env['DB_MAIN_PASSWORD'],
  ...commonDSConfig,
});
