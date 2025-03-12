import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { MicroserviceOptions } from '@nestjs/microservices';
import { RpcException, Transport } from '@nestjs/microservices';

import { envs } from '../config';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger(envs.HSM_BE_CORE_AUTH_NAME);

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.TCP,
      options: {
        host: envs.HSM_BE_CORE_AUTH_HOST,
        port: envs.HSM_BE_CORE_AUTH_PORT,
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
  logger.log(`Microservice is active on port ${envs.HSM_BE_CORE_AUTH_PORT}`);
  logger.log(
    `Websocket server is running on port ${envs.HSM_BE_CORE_AUTH_WS_PORT} `,
  );
}
void bootstrap();
