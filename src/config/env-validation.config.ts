import * as Joi from 'joi';
import {
  ENV_DEV,
  ENV_LOCAL,
  ENV_PROD,
  ENV_STAGING,
  ENV_TEST,
} from '../constants';

const testEnvVars =
  process.env.NODE_ENV === ENV_TEST
    ? {
        DB_TEST_PORT_TEST: Joi.number().required(),
        DB_TEST_DATABASE_TEST: Joi.string().required(),
        DB_TEST_USERNAME_TEST: Joi.string().required(),
        DB_TEST_PASSWORD_TEST: Joi.string().required(),
      }
    : {};

export const envValidationConfig = Joi.object({
  PORT: Joi.number().required(),
  NODE_ENV: Joi.string()
    .valid(ENV_LOCAL, ENV_DEV, ENV_STAGING, ENV_PROD, ENV_TEST)
    .required(),

  SITE_ORIGIN: Joi.string().uri().required(),

  DB_MAIN_HOST: Joi.string().required(),
  DB_MAIN_PORT: Joi.number().required(),
  DB_MAIN_DATABASE: Joi.string().required(),
  DB_MAIN_USERNAME: Joi.string().required(),
  DB_MAIN_PASSWORD: Joi.string().required(),

  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.string().required(),
  IS_WORKER: Joi.string().required().valid('true', 'false'),

  ...testEnvVars,

  TYPEORM_LOGGING: Joi.string().valid('true', 'false'),
});
