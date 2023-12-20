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
        DB_PORT_TEST: Joi.number().required(),
        DB_DATABASE_TEST: Joi.string().required(),
        DB_USERNAME_TEST: Joi.string().required(),
        DB_PASSWORD_TEST: Joi.string().required(),
      }
    : {};

export const envValidationConfig = Joi.object({
  PORT: Joi.number().required(),
  NODE_ENV: Joi.string()
    .valid(ENV_LOCAL, ENV_DEV, ENV_STAGING, ENV_PROD, ENV_TEST)
    .required(),

  SITE_ORIGIN: Joi.string().uri().required(),

  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().required(),
  DB_DATABASE: Joi.string().required(),
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),

  ...testEnvVars,

  TYPEORM_LOGGING: Joi.string().valid('true', 'false'),
});
