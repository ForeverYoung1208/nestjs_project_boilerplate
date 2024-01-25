import { Logger, Provider, Scope } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DatabaseService } from './database.service';
import { ConfigService } from '@nestjs/config';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';

export const datasourceFactory: { [key: string]: Provider } = {
  [Scope.DEFAULT]: {
    provide: 'data_source',
    useFactory: (): null => {
      return null;
    },
  },
  [Scope.REQUEST]: {
    provide: 'data_source',
    inject: [REQUEST, ConfigService, DatabaseService],
    scope: Scope.REQUEST,
    useFactory: async (
      req: Request,
      configService: ConfigService,
      databaseService: DatabaseService,
    ): Promise<DataSource | null> => {
      Logger.debug(
        `host: ${req.hostname}, mocking subdomain as 'tenant1Subdomiain'`,
        'datasourceFactory',
      );
      const subdomain = 'tenant1Subdomiain'; // todo: mocked yet ...getting subdomain
      if (subdomain) {
        const databaseName = await databaseService.getDatabaseName(subdomain);
        return databaseService.getDBDataSource(databaseName);
      }
    },
  },
};
