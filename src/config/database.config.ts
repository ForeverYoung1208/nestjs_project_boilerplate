import { appDataSource } from './datasource/data-source';

export const databaseConfig = {
  ...appDataSource.options,
  extra: {
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 4000,
  },
};
