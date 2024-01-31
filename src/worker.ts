import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { WorkerModule } from './worker/worker.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerModule);

  Logger.overrideLogger(new Logger('Worker'));

  await app.init();
}
bootstrap();
