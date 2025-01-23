import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { MicroserviceOptions } from '@nestjs/microservices';
import { Transport } from '@nestjs/microservices';

import { envs } from '../config';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('AUTH');

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.TCP,
      options: {
        host: envs.AUTH_MICROSERVICE_HOST,
        port: envs.AUTH_MICROSERVICE_PORT,
      },
    },
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  await app.listen();
  logger.log(`Microservice is active on port ${envs.AUTH_MICROSERVICE_PORT}`);
  logger.log(
    `Websocket server is running on port ${envs.AUTH_WEBSOCKET_MICROSERVICE_PORT}`,
  );
}
bootstrap();
