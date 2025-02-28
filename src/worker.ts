import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { initializeTransactionalContext } from 'typeorm-transactional';
import { WorkerModule } from './worker/processors/worker.module';

async function bootstrap() {
  initializeTransactionalContext();

  const app = await NestFactory.createApplicationContext(WorkerModule);
  app.enableShutdownHooks();

  Logger.overrideLogger(new Logger('Worker'));

  await app.init();
}
bootstrap();
