import { DataSource } from 'typeorm';
import * as allDataSources from './datasources';

export default class DataSourceManager {
  private static instance: DataSourceManager;
  private dataSources: { [key: string]: DataSource } = {};
  constructor() {
    this.dataSources = {};
  }

  public static getInstance(): DataSourceManager {
    if (!DataSourceManager.instance) {
      DataSourceManager.instance = new DataSourceManager();
    }
    return DataSourceManager.instance;
  }

  public async getDataSource(dataSourceName: string): Promise<DataSource> {
    if (this.dataSources[dataSourceName]) {
      const dataSource = this.dataSources[dataSourceName];
      return Promise.resolve(
        dataSource.isInitialized ? dataSource : dataSource.initialize(),
      );
    }
    console.log('Initializing new data source', dataSourceName);
    const newDataSource = allDataSources[dataSourceName].default;
    this.dataSources[dataSourceName] = newDataSource;
    return Promise.resolve(newDataSource.initialize());
  }
}
