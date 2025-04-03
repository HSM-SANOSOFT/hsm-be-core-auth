import { Logger } from '@nestjs/common';
import * as oracledb from 'oracledb';
import { envs } from 'src/config';

export const databaseProviders = [
  {
    provide: 'DATABASE_CONNECTION',
    useFactory: async () => {
      const logger = new Logger('DatabaseProvider');
      try {
        oracledb.initOracleClient({
          libDir: envs.LD_LIBRARY_PATH,
        });
        (oracledb.fetchAsString as unknown) = [oracledb.CLOB];
        (oracledb.fetchAsBuffer as unknown) = [oracledb.BLOB];
        const pool = await oracledb.createPool({
          user: envs.DB_USER,
          password: envs.DB_PASSWORD,
          connectString: envs.DB_CONNECTION_STRING,
          poolTimeout: 60,
          poolMin: 1,
          poolMax: 10,
          poolIncrement: 1,
        });
        logger.log('Oracle connection pool established successfully.');

        return pool;
      } catch (error) {
        logger.error(
          `Error during database initialization: ${JSON.stringify(error)}`,
        );
      }
    },
  },
];
