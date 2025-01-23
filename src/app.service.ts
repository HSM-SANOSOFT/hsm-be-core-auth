import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RpcException } from '@nestjs/microservices';

import { DatabaseService } from './database/database.service';
import { AuthLoginDto } from './dto/authLogin.dto';
import { GenerateCodeDto } from './dto/generateCode.dto';
import { ValidateCodeDto } from './dto/validateCode.dto';
import { Websocket } from './websocket/websocket';

@Injectable()
export class AppService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly jwtService: JwtService,
    private readonly websocket: Websocket,
  ) {}

  private readonly logger = new Logger('AUTH');

  InitMS() {
    return 'Microservice is up and running!';
  }

  async login(authLoginDto: AuthLoginDto) {
    const { username, password, websocketClient, ip } = authLoginDto;

    try {
      const isLocked = await this.databaseService.getUserStatus(username);
      if (isLocked !== 0) {
        throw new RpcException({
          status: HttpStatus.FORBIDDEN,
          message:
            'El usuario se encuentra bloqueado. Por favor, ingrese en la opción Desbloquear Usuario o comuníquese con el departamento de soporte técnico para obtener asistencia.',
        });
      }
      await this.databaseService.getPassword(username, password);

      const user = await this.databaseService.getUsers(username);
      const userId = user.USER_ID;
      const userCode = user.CODIGO;

      const activeSesion =
        await this.databaseService.retriveActiveToken(userId);
      if (activeSesion) {
        const activeToken = activeSesion.TOKEN;
        try {
          const decodedToken = this.jwtService.decode(activeToken);
          if (!decodedToken || typeof decodedToken !== 'object') {
            throw new RpcException({
              status: HttpStatus.BAD_REQUEST,
              message: 'Token inválido o malformado.',
            });
          }

          await this.databaseService.updateStatus(userId, activeToken);

          const { websocketClient } = decodedToken;
          this.logger.log(`Websocket client: ${websocketClient}`);
          this.websocket.logout(websocketClient);
        } catch (error) {
          throw new RpcException({
            status: 500,
            message: `Error al manejar la sesión activa: ${error.message || 'Sin detalles adicionales'}`,
          });
        }
      }
      const token = this.jwtService.sign({
        user_id: userId,
        username,
        ip,
        websocketClient,
      });
      await this.databaseService.insertToken(Number(userId), token);
      await this.databaseService.adm_proc_servidores(userCode);
      return {
        success: true,
        message: 'Login exitoso.',
        userData: {
          username,
          userCode,
          userId,
        },
        token: token,
      };
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }
      throw new RpcException({
        status: 500,
        message: `Error inesperado durante el proceso de login: ${error.message || error}`,
      });
    }
  }

  async logout(authHeader: string) {
    try {
      const token = authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : null;

      const decoded = this.jwtService.decode(token) as any;

      if (!decoded || !decoded.user_id) {
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: 'Token inválido o no contiene información de usuario.',
        });
      }

      const { user_id } = decoded;
      await this.databaseService.updateStatus(user_id, token);

      return {
        success: true,
        message: 'Logout Exitoso',
      };
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: `Error inesperado durante el proceso de logout: ${error.message || 'Sin detalles adicionales'}`,
      });
    }
  }

  async generateCode(generatecodeDto: GenerateCodeDto) {
    const { user_cod, tipo, ip } = generatecodeDto;

    try {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      await this.databaseService.updateCode(user_cod, tipo);
      await this.databaseService.insertCode(user_cod, ip, Number(code), tipo);
      this.logger.log(
        `Código ${code} generado exitosamente para el usuario ${user_cod}.`,
      );
      return {
        success: true,
        message: 'Código generado con éxito.',
        data: code,
      };
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }
      throw new RpcException({
        status: 500,
        message: `Error inesperado al generar el código: ${error.message || error}`,
      });
    }
  }

  async validateCode(validateCodeDto: ValidateCodeDto) {
    try {
      await this.databaseService.validateCode(validateCodeDto);
      return {
        success: true,
        message: 'Código validado con éxito.',
      };
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }
      throw new RpcException({
        status: 500,
        message: `Error inesperado durante la validación del código: ${error.message || error}`,
      });
    }
  }
}
