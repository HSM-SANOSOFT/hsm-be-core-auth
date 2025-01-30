import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { MicroserviceOptions } from '@nestjs/microservices';
import { RpcException, Transport } from '@nestjs/microservices';

import { envs } from '../config';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger(envs.AUTH_MICROSERVICE_NAME);

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
      disableErrorMessages: true,
      exceptionFactory: errors => {
        return new RpcException(errors);
      },
    }),
  );
  await app.listen();
  logger.log(`Microservice is active on port ${envs.AUTH_MICROSERVICE_PORT}`);
  logger.log(
    `Websocket server is running on port ${envs.AUTH_WEBSOCKET_MICROSERVICE_PORT} `,
  );
}
bootstrap();
