import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import * as oracledb from 'oracledb';

import { DatabaseService } from '../database.service';
import { PdpLogSegundaVerificacionModel } from '../models';

@Injectable()
export class PdpLogSegundaVerificacionRepository {
  private readonly logger = new Logger();
  constructor(private readonly databaseService: DatabaseService) {}

  async pinGeneration(data: {
    idDocs: string;
    TIPO: string;
    ip: string;
    fecha: Date;
    pin: number;
  }) {
    const resultPinPrev = await this.databaseService.execute<{ NUM: number }>(
      `SELECT COUNT(*) AS NUM FROM PDP_LOG_SEGUNDA_VERIFICACION WHERE CEDULA = :CEDULA AND TIPO = :TIPO AND ESTADO = 'D'`,
      [data.idDocs, data.TIPO],
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    const NUM = resultPinPrev.rows?.[0].NUM || 0;
    if (NUM > 0) {
      const resultPin =
        await this.databaseService.execute<PdpLogSegundaVerificacionModel>(
          `SELECT NUMERO_ENVIADO FROM PDP_LOG_SEGUNDA_VERIFICACION WHERE CEDULA = :CEDULA AND TIPO = :TIPO AND ESTADO = 'D'`,
          [data.idDocs, data.TIPO],
          { outFormat: oracledb.OUT_FORMAT_OBJECT },
        );

      const PIN = resultPin.rows?.[0].NUMERO_ENVIADO;
      return { PIN };
    }

    const resultID = await this.databaseService.execute<{ NUM: number }>(
      'SELECT (X.ID)+1 AS NUM FROM(SELECT P.ID FROM PDP_LOG_SEGUNDA_VERIFICACION P ORDER BY P.ID DESC)X WHERE ROWNUM=1',
      [],
      {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      },
    );

    const ID = resultID.rows?.[0].NUM;

    if (!ID) {
      throw new RpcException({
        statusCode: HttpStatus.NOT_FOUND,
        message: `Failed to generate new ID for CEDULA: ${data.idDocs}`,
      });
    }

    await this.databaseService.execute<PdpLogSegundaVerificacionModel>(
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
    return { PIN: data.pin };
  }

  async pinValidation(data: {
    idDocs: string;
    TIPO: string;
    NUMERO_RECIBIDO: number;
    ip: string;
  }) {
    const resultPin =
      await this.databaseService.execute<PdpLogSegundaVerificacionModel>(
        'SELECT NUMERO_ENVIADO, ACCESO_INCORRECTOS FROM PDP_LOG_SEGUNDA_VERIFICACION WHERE CEDULA = :CEDULA AND TIPO = :TIPO AND ESTADO = :ESTADO',
        [data.idDocs, data.TIPO, 'D'],
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );

    if (!resultPin.rows?.length) {
      throw new RpcException({
        statusCode: HttpStatus.NOT_FOUND,
        message: `No se Encontro Pin Disponible para ID: ${data.idDocs}`,
      });
    }

    const pinInfo = {
      NUMERO_ENVIADO: resultPin.rows?.[0].NUMERO_ENVIADO,
      ACCESO_INCORRECTOS: resultPin.rows?.[0].ACCESO_INCORRECTO as number,
    };

    const NUMERO_ENVIADO = pinInfo.NUMERO_ENVIADO;

    const pinValidation = data.NUMERO_RECIBIDO === NUMERO_ENVIADO;

    if (!pinValidation) {
      const intentoActual = pinInfo.ACCESO_INCORRECTOS;
      if (intentoActual >= 4) {
        await this.databaseService.execute(
          `UPDATE PDP_LOG_SEGUNDA_VERIFICACION SET ESTADO = 'N' WHERE CEDULA = :CEDULA AND TIPO = :TIPO AND ESTADO = :ESTADO AND NUMERO_ENVIADO = :NUMERO_ENVIADO`,
          [data.idDocs, data.TIPO, 'D', NUMERO_ENVIADO],
          { autoCommit: true },
        );
        throw new RpcException({
          statusCode: HttpStatus.FORBIDDEN,
          message: `Excedio el numero de intentos permitidos para ID: ${data.idDocs}`,
        });
      }
      await this.databaseService.execute(
        'UPDATE PDP_LOG_SEGUNDA_VERIFICACION SET ACCESO_INCORRECTOS = :ACCESO_INCORRECTOS WHERE CEDULA = :CEDULA AND TIPO = :TIPO AND ESTADO = :ESTADO AND NUMERO_ENVIADO = :NUMERO_ENVIADO',
        [intentoActual + 1, data.idDocs, data.TIPO, 'D', NUMERO_ENVIADO],
        { autoCommit: true },
      );
      throw new RpcException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: `PIN validation failed for ID: ${data.idDocs}, intento actual: ${intentoActual + 1}`,
      });
    }
    await this.databaseService.execute(
      `UPDATE PDP_LOG_SEGUNDA_VERIFICACION SET ESTADO = 'U' WHERE CEDULA = :CEDULA AND TIPO = :TIPO AND ESTADO = :ESTADO AND NUMERO_ENVIADO = :NUMERO_ENVIADO`,
      [data.idDocs, data.TIPO, 'D', NUMERO_ENVIADO],
      { autoCommit: true },
    );
    return {
      message: `PIN validation successful for ID: ${data.idDocs}`,
    };
  }
}
