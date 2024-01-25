import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import DataSourceManager from './dataSourceManager';

@Injectable()
export class DatabaseService {
  async getDBDataSource(databaseName: string): Promise<DataSource> {
    return DataSourceManager.getInstance().getDataSource(databaseName);
  }

  async getDatabaseName(subdomain: string): Promise<string> {
    Logger.debug(
      `got subdomain ${subdomain}, database name mocked as 'tenant1`,
      'DatabaseService',
    );
    const databaseName = 'tenant1'; //mocked yet
    return databaseName;
  }
}
