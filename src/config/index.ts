import { redisConfig } from './redis.config';
import { envValidationConfig } from './env-validation.config';

export default () => ({
  envValidationConfig,
  redisConfig,
});
