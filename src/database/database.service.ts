// src/database/database.service.ts
import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import * as oracledb from 'oracledb';

@Injectable()
export class DatabaseService {
  private readonly logger = new Logger(DatabaseService.name);
  constructor(
    @Inject('DATABASE_CONNECTION') private readonly dbPool: oracledb.Pool,
  ) {}

  async pinGeneration(data: {
    idDocs: string;
    TIPO: string;
    ip: string;
    fecha: Date;
    pin: number;
  }) {
    let connection: oracledb.Connection | null = null;
    try {
      connection = await this.dbPool.getConnection();

      const resultPinPrev = await connection.execute(
        `SELECT COUNT(*) AS NUM FROM PDP_LOG_SEGUNDA_VERIFICACION WHERE CEDULA = :CEDULA AND TIPO = :TIPO AND ESTADO = 'D'`,
        [data.idDocs, data.TIPO],
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );
      const NUM = (resultPinPrev.rows?.[0] as { NUM: number }).NUM || 0;
      if (NUM > 0) {
        const resultPin = await connection.execute(
          `SELECT NUMERO_ENVIADO AS PIN FROM PDP_LOG_SEGUNDA_VERIFICACION WHERE CEDULA = :CEDULA AND TIPO = :TIPO AND ESTADO = 'D'`,
          [data.idDocs, data.TIPO],
          { outFormat: oracledb.OUT_FORMAT_OBJECT },
        );
        const PIN = (resultPin.rows?.[0] as { PIN: number }).PIN;
        throw new RpcException({
          status: HttpStatus.CONFLICT,
          message: `Record already exists for ID: ${data.idDocs}`,
          data: { PIN },
        });
      }

      const resultID = await connection.execute(
        'SELECT (X.ID)+1 AS NUM FROM(SELECT P.ID FROM PDP_LOG_SEGUNDA_VERIFICACION P ORDER BY P.ID DESC)X WHERE ROWNUM=1',
        [],
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );
      const ID = (resultID.rows?.[0] as { NUM: number }).NUM;

      if (!ID) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: `Failed to generate new ID for CEDULA: ${data.idDocs}`,
        });
      }

      await connection.execute(
        `INSERT INTO PDP_LOG_SEGUNDA_VERIFICACION (ID, CEDULA, TIPO, IP, FECHA, NUMERO_ENVIADO) VALUES (:ID, :CEDULA, :TIPO, :IP, :FECHA, :PIN)`,
        {
          ID,
          CEDULA: data.idDocs,
          TIPO: data.TIPO,
          IP: data.ip,
          FECHA: data.fecha,
          PIN: data.pin,
        },
        { autoCommit: true },
      );
      return {
        message: `PIN generated successfully for CEDULA: ${data.idDocs}`,
        data: { PIN: data.pin },
      };
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }
      this.logger.error(`Error fetching data: ${error}`);
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: `Error fetching data: ${error}`,
      });
    } finally {
      if (connection) {
        try {
          await connection.close();
        } catch (error) {
          this.logger.error(error);
        }
      }
    }
  }

  async pinValidation(data: {
    idDocs: string;
    TIPO: string;
    NUMERO_RECIBIDO: number;
    ip: string;
  }) {
    let connection: oracledb.Connection | null = null;
    try {
      connection = await this.dbPool.getConnection();
      const resultPin = await connection.execute(
        'SELECT NUMERO_ENVIADO, ACCESO_INCORRECTOS FROM PDP_LOG_SEGUNDA_VERIFICACION WHERE CEDULA = :CEDULA AND TIPO = :TIPO AND ESTADO = :ESTADO',
        [data.idDocs, data.TIPO, 'D'],
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );

      if (!resultPin.rows?.length) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: `No se Encontro Pin Disponible para ID: ${data.idDocs}`,
        });
      }

      const pinInfo = resultPin.rows?.[0] as {
        NUMERO_ENVIADO: number;
        ACCESO_INCORRECTOS: number;
      };

      const NUMERO_ENVIADO = pinInfo.NUMERO_ENVIADO;

      const pinValidation = data.NUMERO_RECIBIDO === NUMERO_ENVIADO;

      if (!pinValidation) {
        const intentoActual = pinInfo.ACCESO_INCORRECTOS;

        if (intentoActual >= 4) {
          await connection.execute(
            `UPDATE PDP_LOG_SEGUNDA_VERIFICACION SET ESTADO = 'N' WHERE CEDULA = :CEDULA AND TIPO = :TIPO AND ESTADO = :ESTADO AND NUMERO_ENVIADO = :NUMERO_ENVIADO`,
            [data.idDocs, data.TIPO, 'D', NUMERO_ENVIADO],
            { autoCommit: true },
          );
          throw new RpcException({
            status: HttpStatus.FORBIDDEN,
            message: `Excedio el numero de intentos permitidos para ID: ${data.idDocs}`,
          });
        }

        await connection.execute(
          'UPDATE PDP_LOG_SEGUNDA_VERIFICACION SET ACCESO_INCORRECTOS = :ACCESO_INCORRECTOS WHERE CEDULA = :CEDULA AND TIPO = :TIPO AND ESTADO = :ESTADO AND NUMERO_ENVIADO = :NUMERO_ENVIADO',
          [intentoActual + 1, data.idDocs, data.TIPO, 'D', NUMERO_ENVIADO],
          { autoCommit: true },
        );
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: `PIN validation failed for ID: ${data.idDocs}, intento actual: ${intentoActual + 1}`,
        });
      }
      await connection.execute(
        `UPDATE PDP_LOG_SEGUNDA_VERIFICACION SET ESTADO = 'U' WHERE CEDULA = :CEDULA AND TIPO = :TIPO AND ESTADO = :ESTADO AND NUMERO_ENVIADO = :NUMERO_ENVIADO`,
        [data.idDocs, data.TIPO, 'D', NUMERO_ENVIADO],
        { autoCommit: true },
      );

      return {
        message: `PIN validation successful for ID: ${data.idDocs}`,
      };
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }
      this.logger.error(`Error fetching data: ${error}`);
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: `Error fetching data: ${error}`,
      });
    } finally {
      if (connection) {
        try {
          await connection.close();
        } catch (error) {
          this.logger.error(error);
        }
      }
    }
  }
}
