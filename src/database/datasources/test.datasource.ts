import * as dotenv from 'dotenv';
import { commonDSConfig } from './commonDSConfig';
import { DataSource } from 'typeorm';
dotenv.config();

export default new DataSource({
  name: 'test',
  type: 'postgres',
  host: process.env['DB_TEST_HOST'],
  port: parseInt(process.env['DB_TEST_PORT'], 10),
  database: process.env['DB_TEST_DATABASE'],
  username: process.env['DB_TEST_USERNAME'],
  password: process.env['DB_TEST_PASSWORD'],
  ...commonDSConfig,
});
