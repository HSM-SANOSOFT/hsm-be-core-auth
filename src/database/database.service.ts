// src/database/database.service.ts
import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { envs } from 'config';
import { Connection } from 'oracledb';
import * as oracledb from 'oracledb';
import { ValidateCodeDto } from 'src/dto/validateCode.dto';

@Injectable()
export class DatabaseService {
  constructor(
    @Inject('DATABASE_CONNECTION') private readonly connection: Connection,
  ) {}

  private readonly logger = new Logger('AUTH DATABASE');

  async getUsers(username: string) {
    try {
      const result = await this.connection.execute(
        `SELECT D.USERNAME, D.USER_ID, P.CODIGO, (P.NOMBRES || ' ' || P.APELLIDOS) AS NOMBRE, P.EMAIL 
       FROM DBA_USERS D 
       INNER JOIN PERSONAL P ON P.USUARIO = D.USERNAME 
       WHERE D.USERNAME = :username 
       AND P.CARGO IS NOT NULL 
       AND P.ESTADO_DE_DISPONIBILIDAD = 'D'`,
        [username],
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );

      if (result.rows.length === 0) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: 'Usuario no encontrado.',
        });
      }

      return result.rows[0];
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: `Error inesperado al ejecutar la consulta: ${error.message || error}`,
      });
    }
  }

  async getUserStatus(username: string): Promise<number> {
    try {
      const result = await this.connection.execute(
        `SELECT COUNT(*) AS NUM 
       FROM DBA_USERS 
       WHERE USERNAME = :username 
       AND ACCOUNT_STATUS LIKE '%LOCKED%'`,
        [username],
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );

      // Ensure NUM is safely extracted
      const userStatus = result.rows[0]?.NUM || 0;
      return userStatus;
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: `Error inesperado al ejecutar la consulta: ${error.message || error}`,
      });
    }
  }

  async getPassword(username: string, password: string): Promise<boolean> {
    try {
      const connection = await oracledb.getConnection({
        user: username,
        password: password,
        connectString: envs.DB_CONNECTION_STRING,
      });

      await connection.close();
      return true; // Password is valid
    } catch (error) {
      if (error.errorNum === 1017) {
        // Invalid username/password error
        throw new RpcException({
          status: HttpStatus.UNAUTHORIZED,
          message: 'Usuario o contraseña incorrectos.',
        });
      }

      // Handle all other errors
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Error inesperado al validar las credenciales.',
      });
    }
  }

  async insertToken(id_user: number, token: string): Promise<boolean> {
    try {
      const result = await this.connection.execute(
        `INSERT INTO LOG_SESSION (id_user, token) VALUES (:id_user, :token)`,
        {
          id_user: Number(id_user),
          token,
        },
        { autoCommit: true },
      );

      if (result.rowsAffected && result.rowsAffected > 0) {
        return true; // Token successfully inserted
      }

      throw new RpcException({
        status: HttpStatus.CONFLICT,
        message: 'No se pudo insertar el token.',
      });
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: `Error inesperado al insertar el token: ${error.message || 'Sin detalles adicionales'}`,
      });
    }
  }

  async adm_proc_servidores(cod: string): Promise<boolean> {
    try {
      await this.connection.execute(
        `BEGIN ADM_PROC_SERVIDORES(:accion, :cod, :estado); END;`,
        { accion: 'INS', cod, estado: 'ENT' },
        { autoCommit: true },
      );
      return true; // Procedure executed successfully
    } catch (error) {
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: `Error inesperado al ejecutar el procedimiento: ${error.message || 'Sin detalles adicionales'}`,
      });
    }
  }

  async updateStatus(userId: number, token: string): Promise<boolean> {
    try {
      const result = await this.connection.execute(
        `UPDATE LOG_SESSION SET STATUS = 0 WHERE ID_USER = :userId AND TOKEN = :token`,
        { userId, token },
        { autoCommit: true },
      );

      if (result.rowsAffected && result.rowsAffected > 0) {
        this.logger.log('Token status changed');
        return true; // Update successful
      }

      throw new RpcException({
        status: HttpStatus.NOT_FOUND,
        message: 'No se encontró ninguna sesión activa para actualizar.',
      });
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: `Error inesperado al actualizar el estado: ${error.message || 'Sin detalles adicionales'}`,
      });
    }
  }

  async retriveActiveToken(userId: number): Promise<any> {
    try {
      const result = await this.connection.execute(
        `SELECT * FROM LOG_SESSION WHERE ID_USER = :userId AND STATUS = 1`,
        { userId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );

      return result.rows[0] || null;
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: `Error inesperado al ejecutar la consulta: ${error.message || error}`,
      });
    }
  }

  async validateCode(validateCodeDto: ValidateCodeDto): Promise<boolean> {
    const { user_cod, code, tipo } = validateCodeDto;

    try {
      const result = await this.connection.execute(
        `SELECT INTENTO FROM PDP_LOG_COD_VERIFICACION 
       WHERE USER_COD = :user_cod AND ESTADO = '1' AND TIPO = :tipo AND CODIGO = :code`,
        { user_cod, tipo, code },
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );
      if (result.rows.length === 0) {
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: 'Código incorrecto.',
        });
      }
      const currentIntento = result.rows[0].INTENTO + 1;
      if (currentIntento >= 5) {
        await this.connection.execute(
          `UPDATE PDP_LOG_COD_VERIFICACION 
         SET ESTADO = 0, INTENTO = :currentIntento 
         WHERE USER_COD = :user_cod AND TIPO = :tipo AND CODIGO = :code`,
          { currentIntento, user_cod, tipo, code },
          { autoCommit: true },
        );
        throw new RpcException({
          status: HttpStatus.NOT_ACCEPTABLE,
          message: 'Código bloqueado por intentos fallidos.',
        });
      }
      await this.connection.execute(
        `UPDATE PDP_LOG_COD_VERIFICACION 
       SET INTENTO = :currentIntento 
       WHERE USER_COD = :user_cod AND TIPO = :tipo AND CODIGO = :code`,
        { currentIntento, user_cod, tipo, code },
        { autoCommit: true },
      );

      return true;
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: `Error inesperado en la base de datos: ${error.message || 'Sin detalles adicionales'}`,
      });
    }
  }

  async insertCode(
    codigo: string,
    ip: string,
    codigo_verificacion: number,
    tipo: string,
  ): Promise<boolean> {
    try {
      const result = await this.connection.execute(
        `INSERT INTO PDP_LOG_COD_VERIFICACION 
       (USER_COD, IP, CODIGO, TIPO, ESTADO) 
       VALUES (:codigo, :ip, :codigo_verificacion, :tipo, :estado)`,
        { codigo, ip, codigo_verificacion, tipo, estado: 1 },
        { autoCommit: true },
      );

      if (result.rowsAffected && result.rowsAffected > 0) {
        return true; // Insert successful
      }

      throw new RpcException({
        status: HttpStatus.CONFLICT,
        message: 'No se pudo insertar el registro.',
      });
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: `Error inesperado en la base de datos: ${error.message || 'Sin detalles adicionales'}`,
      });
    }
  }

  async updateCode(codigo: string, tipo: string): Promise<boolean> {
    try {
      const result = await this.connection.execute(
        `UPDATE PDP_LOG_COD_VERIFICACION 
       SET ESTADO = :estado 
       WHERE USER_COD = :codigo AND ESTADO = 1 AND TIPO = :tipo`,
        { codigo, tipo, estado: 0 },
        { autoCommit: true },
      );

      if (result.rowsAffected && result.rowsAffected > 0) {
        return true; // Update successful
      }

      throw new RpcException({
        status: HttpStatus.NOT_FOUND,
        message: 'No se encontró ningún registro para actualizar.',
      });
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: `Error inesperado en la base de datos: ${error.message || 'Sin detalles adicionales'}`,
      });
    }
  }
}
