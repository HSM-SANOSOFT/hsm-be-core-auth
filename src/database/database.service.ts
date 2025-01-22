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
    @Inject('ORACLE_CONNECTION') private readonly connection: Connection,
  ) {}

  private readonly logger = new Logger('AUTH DATABASE');

  private response = {
    error: (error: string, status = HttpStatus.BAD_REQUEST) => {
      //this.logger.log(`Error al ejecutar la consulta: ${error}`);
      throw new RpcException({
        status,
        message: {
          success: false,
          error: error,
        },
      });
    },
  };

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
          status: 404,
          message: 'Usuario no encontrado.',
        });
      }

      return result.rows[0];
    } catch (error) {
      if (error instanceof RpcException) {
        throw error; // Re-throw known RpcException
      }

      throw new RpcException({
        status: 500,
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
      this.logger.error(
        `Error in getUserStatus for username: ${username}, Error: ${error.message}`,
      );

      // Directly throw an RpcException for unexpected errors
      throw new RpcException({
        status: 500,
        message: `Error inesperado al ejecutar la consulta.`,
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
          status: 400,
          message: 'Usuario o contraseña incorrectos.',
        });
      }

      // Handle all other errors
      throw new RpcException({
        status: 500,
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
          token: token,
        },
        { autoCommit: true },
      );

      if (result.rowsAffected && result.rowsAffected > 0) {
        return true;
      } else {
        throw new RpcException({
          status: 400,
          message: 'No se pudo insertar el token.',
        });
      }
    } catch (error) {
      this.logger.error(`Error al ejecutar la consulta: ${error.message}`);

      if (error instanceof RpcException) {
        throw error; // Re-throw known RpcException
      }

      throw new RpcException({
        status: 500,
        message: `Error inesperado al insertar el token: ${error.message || error}`,
      });
    }
  }

  async adm_proc_servidores(cod: string): Promise<boolean> {
    try {
      await this.connection.execute(
        `BEGIN ADM_PROC_SERVIDORES(:accion, :cod, :estado); END;`,
        { accion: 'INS', cod: cod, estado: 'ENT' },
        { autoCommit: true },
      );
      return true;
    } catch (error) {
      this.logger.error(`Error al ejecutar la consulta: ${error.message}`);

      if (error instanceof RpcException) {
        throw error; // Re-throw known RpcException
      }

      throw new RpcException({
        status: 500,
        message: `Error inesperado al ejecutar el procedimiento: ${error.message || error}`,
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
        return true;
      } else {
        throw new RpcException({
          status: 400,
          message: 'No se encontró ninguna sesión activa para actualizar.',
        });
      }
    } catch (error) {
      this.logger.error(`Error al ejecutar la consulta: ${error.message}`);

      if (error instanceof RpcException) {
        throw error; // Re-throw known RpcException
      }

      throw new RpcException({
        status: 500,
        message: `Error inesperado al actualizar el estado: ${error.message || error}`,
      });
    }
  }

  async retriveActiveToken(userId: number) {
    try {
      const result = await this.connection.execute(
        `SELECT * FROM LOG_SESSION WHERE ID_USER = :userId AND STATUS = 1`,
        { userId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );

      return result.rows[0];
    } catch (error) {
      this.logger.error(`Error checking token status: ${error.message}`);

      if (error instanceof RpcException) {
        throw error; // Re-throw known RpcException
      }

      throw new RpcException({
        status: 500,
        message: `Error inesperado al verificar el estado del token: ${error.message || error}`,
      });
    }
  }

  async menuUsuario(usercode: string) {
    try {
      const result = await this.connection.execute(
        `SELECT SGM.ID_GRUPO_MENU, SGM.DESCRIPCION AS MENU, MDG.POSICION, MDG.ID_SUBGRUPO, 
              MDG.NOM_COR AS SUB_MENU, MDG.DESCRIPCION AS DES_SUBMENU, CM.ID_CONTENIDO, 
              CM.DIRECTORIO, CM.DESCRIPCION AS NOMBRE, CM.PARAMETROS, CM.NOMBRE_ARCHIVO, CM.ORDEN
       FROM SN_PRIVILEGIOS_USUARIO_MODULOS PUM
       INNER JOIN SN_GRUPO_MENU SGM ON SGM.ID_GRUPO_MENU = PUM.ID_GRUPO
       INNER JOIN SN_SUBGRUPO_MENU MDG ON PUM.ID_GRUPO = MDG.ID_GRUPO AND PUM.ID_MENU = MDG.ID_SUBGRUPO
       INNER JOIN SN_CONTENIDO_MENU_N CM ON CM.ID_CONTENIDO = PUM.ID_CONTENIDO
       WHERE PUM.CODIGO_USUARIO = :usercode AND MDG.ESTATUS = 'A' AND PUM.ESTATUS = 'A' AND CM.ESTATUS = 'A'
       ORDER BY SGM.ID_GRUPO_MENU, MDG.POSICION, CM.ORDEN ASC`,
        [usercode],
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );

      if (result.rows.length === 0) {
        throw new RpcException({
          status: 404,
          message: 'No se encontraron menús disponibles para este usuario.',
        });
      }

      return result.rows;
    } catch (error) {
      this.logger.error(`Error al ejecutar la consulta: ${error.message}`);

      if (error instanceof RpcException) {
        throw error; // Re-throw known RpcException
      }

      throw new RpcException({
        status: 500,
        message: `Error inesperado al ejecutar la consulta: ${error.message || error}`,
      });
    }
  }

  async validateCode(validateCodeDto: ValidateCodeDto) {
    const { user_cod, code, tipo } = validateCodeDto;

    try {
      // Check if the code exists and is valid
      const result = await this.connection.execute(
        `SELECT INTENTO FROM PDP_LOG_COD_VERIFICACION 
       WHERE USER_COD = :user_cod AND ESTADO = '1' AND TIPO = :tipo AND CODIGO = :code`,
        { user_cod, tipo, code },
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );

      if (result.rows.length === 0) {
        throw new RpcException({
          status: 400,
          message: 'Código incorrecto.',
        });
      }

      // Increment the attempt count
      const currentIntento = result.rows[0].INTENTO + 1;

      // Check if the maximum number of attempts has been reached
      if (currentIntento >= 5) {
        await this.connection.execute(
          `UPDATE PDP_LOG_COD_VERIFICACION 
         SET ESTADO = 0, INTENTO = :currentIntento 
         WHERE USER_COD = :user_cod AND TIPO = :tipo AND CODIGO = :code`,
          { currentIntento, user_cod, tipo, code },
          { autoCommit: true },
        );
        throw new RpcException({
          status: 400,
          message: 'Código bloqueado por intentos fallidos.',
        });
      }

      // Update the attempt count in the database
      await this.connection.execute(
        `UPDATE PDP_LOG_COD_VERIFICACION 
       SET INTENTO = :currentIntento 
       WHERE USER_COD = :user_cod AND TIPO = :tipo AND CODIGO = :code`,
        { currentIntento, user_cod, tipo, code },
        { autoCommit: true },
      );

      return {
        success: true,
        message: 'Código correcto.',
      };
    } catch (error) {
      if (error instanceof RpcException) {
        throw error; // Re-throw known RpcException
      }

      this.logger.error(`Unexpected server error: ${error.message}`);

      throw new RpcException({
        status: 500,
        message: 'Unexpected server error.',
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
        this.logger.log('Registro insertado con éxito.');
        return true;
      } else {
        this.logger.warn('No se insertó ningún registro.');
        throw new RpcException({
          status: 400,
          message: 'No se pudo insertar el registro.',
        });
      }
    } catch (error) {
      this.logger.error(`Error en la base de datos: ${error.message}`);

      if (error instanceof RpcException) {
        throw error; // Re-throw known RpcException
      }

      throw new RpcException({
        status: 500,
        message: `Error inesperado en la base de datos: ${error.message || error}`,
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
        this.logger.log('Registro actualizado con éxito.');
        return true;
      } else {
        this.logger.warn('No se actualizó ningún registro.');
        throw new RpcException({
          status: 400,
          message: 'No se encontró ningún registro para actualizar.',
        });
      }
    } catch (error) {
      this.logger.error(`Error en la base de datos: ${error.message}`);

      if (error instanceof RpcException) {
        throw error; // Re-throw known RpcException
      }

      throw new RpcException({
        status: 500,
        message: `Error inesperado en la base de datos: ${error.message || error}`,
      });
    }
  }
}
