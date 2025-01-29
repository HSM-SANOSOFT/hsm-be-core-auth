import { Logger } from '@nestjs/common';
import { envs } from 'config';
import * as oracledb from 'oracledb';

export const databaseProviders = [
  {
    provide: 'DATABASE_CONNECTION',
    useFactory: async () => {
      const logger = new Logger('DatabaseProvider'); // Initialize NestJS Logger

      try {
        oracledb.initOracleClient({ libDir: envs.LD_LIBRARY_PATH });
        logger.log('Oracle client initialized.');

        const pool = await oracledb.createPool({
          user: envs.DB_USER,
          password: envs.DB_PASSWORD,
          connectString: envs.DB_CONNECTION_STRING,
        });
        logger.log('Connection pool created successfully.');

        const connection = await pool.getConnection();
        logger.log('Database connection established successfully.');

        return connection;
      } catch (error) {
        logger.error(
          'Error during database initialization:',
          error.message || error,
        );
        throw error; // Re-throw the error to propagate it up the chain
      }
    },
  },
];
