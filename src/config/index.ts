import { databaseConfig } from './database.config';
import { redisConfig } from './redis.config';
import { envValidationConfig } from './env-validation.config';

export default () => ({
  databaseConfig,
  envValidationConfig,
  redisConfig,
});
