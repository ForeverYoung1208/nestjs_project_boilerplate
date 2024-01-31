import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  ENV_DEV,
  ENV_LOCAL,
  ENV_STAGING,
  VALIDATION_PIPE_OPTIONS,
} from './constants';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger, ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const currentEnv = configService.get('NODE_ENV');
  const isWorker = configService.get('IS_WORKER');
  Logger.verbose(
    `== Running in environment "${currentEnv}", isWorker: ${isWorker}`,
  );
  app.useGlobalPipes(new ValidationPipe(VALIDATION_PIPE_OPTIONS));
  // Load swagger, load only for local, staging and dev environments
  if ([ENV_LOCAL, ENV_STAGING, ENV_DEV].includes(currentEnv)) {
    const apiVersion = process.env.npm_package_version;
    const swaggerConfig = new DocumentBuilder()
      .setTitle('UDK2 weboffice api')
      .setDescription(`Api description for environment '${currentEnv}'`)
      .setVersion(apiVersion)
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/doc', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
  }
  if (isWorker !== 'true') {
    await app.listen(process.env.PORT);
    Logger.verbose(`listen to port ${configService.get('PORT')}`);
  } else {
    // await app.listen('3002');
    await app.init();
    Logger.verbose(`Worker not supposed to listen to any port`);
  }
}
bootstrap();
