import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import * as oracledb from 'oracledb';

@Injectable()
export class DatabaseService {
  private readonly logger = new Logger();
  constructor(
    @Inject('DATABASE_CONNECTION') private readonly dbPool: oracledb.Pool,
  ) {}

  async execute<T>(
    query: string,
    bindParams: oracledb.BindParameters = {},
    options: oracledb.ExecuteOptions = {},
  ): Promise<oracledb.Result<T>> {
    let connection: oracledb.Connection | null = null;
    try {
      connection = await this.dbPool.getConnection();
      const result: oracledb.Result<T> = await connection.execute(
        query,
        bindParams,
        options,
      );
      return result;
    } catch (error) {
      this.logger.error(JSON.stringify(error));
      throw new RpcException({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: JSON.stringify(error),
      });
    } finally {
      if (connection) {
        try {
          await connection.close();
        } catch (error) {
          this.logger.error('Error closing connection' + JSON.stringify(error));
        }
      }
    }
  }
}
