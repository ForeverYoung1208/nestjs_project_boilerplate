import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { ENV_TEST } from '../../constants';
dotenv.config();

// execute tests on test database
let dbPortEnvKey, dbEnvKey, dbUserEnvKey, dbPasswordEnvKey, entitiesPaths;
if (process.env.NODE_ENV === ENV_TEST) {
  dbEnvKey = 'DB_DATABASE_TEST';
  dbUserEnvKey = 'DB_USERNAME_TEST';
  dbPasswordEnvKey = 'DB_PASSWORD_TEST';
  dbPortEnvKey = 'DB_PORT_TEST';
  entitiesPaths = ['src/entities/**/*entity.ts'];
} else {
  dbEnvKey = 'DB_DATABASE';
  dbUserEnvKey = 'DB_USERNAME';
  dbPasswordEnvKey = 'DB_PASSWORD';
  dbPortEnvKey = 'DB_PORT';
  entitiesPaths = ['dist/entities/**/*entity.js'];
}

export const appDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env[dbPortEnvKey], 10),
  database: process.env[dbEnvKey],
  username: process.env[dbUserEnvKey],
  password: process.env[dbPasswordEnvKey],
  synchronize: false,
  entities: entitiesPaths,
  migrations: ['dist/DB/migrations/**/*.js'],
  logging: process.env.TYPEORM_LOGGING === 'true',
});
