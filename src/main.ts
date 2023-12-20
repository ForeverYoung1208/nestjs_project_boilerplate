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
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const currentEnv = configService.get('NODE_ENV');
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

  await app.listen(process.env.PORT);
}
bootstrap();
