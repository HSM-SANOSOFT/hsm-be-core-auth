// src/database/database.module.ts
import { Global, Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { envs } from 'config';
import * as oracledb from 'oracledb';

import { DatabaseService } from './database.service';

@Global()
@Module({
  imports: [ConfigModule.forRoot()],
  providers: [
    {
      provide: 'ORACLE_CONNECTION',
      useFactory: async () => {
        const logger = new Logger('AUTH DATABASE');
        try {
          oracledb.initOracleClient({
            libDir: envs.ORACLE_CLIENT_PATH,
          });

          const connection = await oracledb.getConnection({
            user: envs.DB_USER,
            password: envs.DB_PASSWORD,
            connectString: envs.DB_CONNECTION_STRING,
          });
          logger.log('Conexión a Oracle establecida');
          return connection;
        } catch (error) {
          logger.log('Error al conectar a Oracle:', error);
          throw error;
        }
      },
      inject: [ConfigService],
    },
    DatabaseService,
  ],
  exports: ['ORACLE_CONNECTION', DatabaseService],
})
export class DatabaseModule {}
