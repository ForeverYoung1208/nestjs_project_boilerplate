import {
  ForbiddenException,
  LogLevel,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

export const ENV_LOCAL = 'local';
export const ENV_DEV = 'development';
export const ENV_STAGING = 'staging';
export const ENV_PROD = 'production';
export const ENV_TEST = 'test';

export const regexDateString = new RegExp(`\\d{4}-\\d{2}-\\d{2}`);
export const DATE_FORMAT = 'YYYY-MM-DD';

export const VALIDATION_PIPE_OPTIONS = {
  whitelist: true,
  forbidNonWhitelisted: true,
  errorHttpStatusCode: 422,
};

export enum LogLevelN {
  Error = 'error',
  Warn = 'warn',
  Log = 'log',
  Debug = 'debug',
  Verbose = 'verbose',
}

export const LOG_TYPES: LogLevel[] = [ENV_STAGING, ENV_PROD].includes(
  process.env.NODE_ENV,
)
  ? [LogLevelN.Error, LogLevelN.Warn]
  : [
      LogLevelN.Log,
      LogLevelN.Error,
      LogLevelN.Warn,
      LogLevelN.Debug,
      LogLevelN.Verbose,
    ];

export const SKIP_LOGGING_EXCEPTIONS = [
  ForbiddenException,
  UnauthorizedException,
  NotFoundException,
];

export const ADD_ORIGINAL_MESSAGE_TO_NESTED_ERROR_RESPONSE = true;
