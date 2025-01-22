import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RpcException } from '@nestjs/microservices';

import { DatabaseService } from './database/database.service';
import { AuthLoginDto } from './dto/authLogin.dto';
import { GenerateCodeDto } from './dto/generateCode.dto';
import { UserMenuDto } from './dto/usermenu.dto';
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

  private response = {
    success: (data: any, token: string, message = 'Operation Successful') => ({
      success: true,
      message,
      data: data || '',
      token: token || '',
    }),

    error: (error: string, statusCode = 400) => {
      throw new RpcException({
        statusCode,
        message: {
          success: false,
          error: error,
          data: [],
          token: '',
        },
      });
    },
  };

  InitMS() {
    return 'Microservice is up and running!';
  }

  async login(authLoginDto: AuthLoginDto) {
    const { username, password, websocketClient, ip } = authLoginDto;

    try {
      // Check if user is locked
      const isLocked = await this.databaseService.getUserStatus(username);
      if (isLocked !== 0) {
        throw new RpcException({
          status: 403,
          message:
            'El usuario se encuentra bloqueado. Por favor, ingrese en la opción Desbloquear Usuario o comuníquese con el departamento de soporte técnico para obtener asistencia.',
        });
      }

      // Validate password
      const isPasswordValid = await this.databaseService.getPassword(
        username,
        password,
      );
      if (!isPasswordValid) {
        throw new RpcException({
          status: 400,
          message: 'Usuario o Contraseña incorrecto.',
        });
      }

      // Retrieve user information
      const user = await this.databaseService.getUsers(username);
      if (!user) {
        throw new RpcException({
          status: 404,
          message: 'Usuario no encontrado.',
        });
      }

      const userId = user.USER_ID;
      const userCode = user.CODIGO;

      // Handle active token
      const activeSesion =
        await this.databaseService.retriveActiveToken(userId);
      if (activeSesion) {
        const activeToken = activeSesion.TOKEN;
        const decodedToken = this.jwtService.decode(activeToken);
        const { websocketClient } = decodedToken;
        await this.databaseService.updateStatus(userId, activeToken);
        this.websocket.logout(websocketClient);
      }

      // Generate new token
      const token = this.jwtService.sign({
        user_id: userId,
        username,
        ip,
        websocketClient,
      });

      // Insert new token
      const isTokenInserted = await this.databaseService.insertToken(
        Number(userId),
        token,
      );
      if (!isTokenInserted) {
        throw new RpcException({
          status: 500,
          message:
            'Ha ocurrido un error al registrar el token. Por favor, intente nuevamente más tarde o comuníquese con el departamento de soporte técnico para obtener asistencia.',
        });
      }

      // Register user in the system
      const isProcedureSuccess =
        await this.databaseService.adm_proc_servidores(userCode);
      if (!isProcedureSuccess) {
        throw new RpcException({
          status: 500,
          message:
            'Ha ocurrido un error al registrar el usuario en el turnero. Por favor, intente nuevamente más tarde o comuníquese con el departamento de soporte técnico para obtener asistencia.',
        });
      }

      // Return success response
      return this.response.success(user, token, 'Login Exitoso');
    } catch (error) {
      this.logger.error(`Error en el login: ${error.message}`);

      if (error instanceof RpcException) {
        throw error; // Re-throw known exceptions
      }

      throw new RpcException({
        status: 500,
        message: `Error inesperado durante el proceso de login: ${error.message || error}`,
      });
    }
  }

  async logout(authHeader: any) {
    try {
      // Extract and decode the token
      const token = authHeader.split(' ')[1];
      const decoded = this.jwtService.decode(token) as any;

      if (!decoded || !decoded.user_id) {
        throw new RpcException({
          status: 400,
          message: 'Token inválido o no contiene información de usuario.',
        });
      }

      const { user_id } = decoded;

      // Update the token status in the database
      const result = await this.databaseService.updateStatus(user_id, token);
      if (!result) {
        throw new RpcException({
          status: 400,
          message:
            'No se pudo cerrar la sesión. El token no está activo o ya fue deshabilitado.',
        });
      }

      return this.response.success('', '', 'Logout Exitoso');
    } catch (error) {
      this.logger.error(`Error durante el logout: ${error.message}`);

      if (error instanceof RpcException) {
        throw error; // Re-throw known RpcException
      }

      throw new RpcException({
        status: 500,
        message: `Error inesperado durante el proceso de logout: ${error.message || error}`,
      });
    }
  }

  async usermenu(usermenuDto: UserMenuDto) {
    const { usercode } = usermenuDto;

    try {
      const datos = await this.databaseService.menuUsuario(usercode);

      if (!datos || datos.length === 0) {
        throw new RpcException({
          status: 404,
          message: 'No se encontraron menús disponibles para este usuario.',
        });
      }

      const menu: any[] = [];

      // Build the menu structure
      datos.forEach(item => {
        let group = menu.find(g => g.id === item.ID_GRUPO_MENU);

        if (!group) {
          group = {
            id: item.ID_GRUPO_MENU,
            Nombre: item.MENU,
            icono: '',
            submenu: [],
          };
          menu.push(group);
        }

        let submenu = group.submenu.find(s => s.id === item.ID_SUBGRUPO);
        if (!submenu) {
          submenu = {
            id: item.ID_SUBGRUPO,
            Nombre: item.SUB_MENU,
            descripcion: item.DES_SUBMENU,
            items: [],
          };
          group.submenu.push(submenu);
        }

        submenu.items.push({
          id: item.ID_CONTENIDO,
          Nombre: item.NOMBRE,
          url: item.DIRECTORIO + item.NOMBRE_ARCHIVO + item.PARAMETROS,
        });
      });

      return this.response.success(menu, '', 'Menú generado exitosamente.');
    } catch (error) {
      this.logger.error(
        `Error al generar el menú de usuario: ${error.message}`,
      );

      if (error instanceof RpcException) {
        throw error; // Re-throw known RpcException
      }

      throw new RpcException({
        status: 500,
        message: `Error inesperado al generar el menú de usuario: ${error.message || error}`,
      });
    }
  }

  async generateCode(generatecodeDto: GenerateCodeDto) {
    const { user_cod, tipo, ip } = generatecodeDto;

    try {
      // Generate a 6-digit random code
      const code = Math.floor(100000 + Math.random() * 900000).toString();

      // Update the existing code status
      const updateResult = await this.databaseService.updateCode(
        user_cod,
        tipo,
      );
      if (!updateResult) {
        throw new RpcException({
          status: 400,
          message: 'No se pudo actualizar el código anterior.',
        });
      }

      // Insert the new verification code
      const insertResult = await this.databaseService.insertCode(
        user_cod,
        ip,
        Number(code),
        tipo,
      );
      if (!insertResult) {
        throw new RpcException({
          status: 500,
          message: 'No se pudo insertar el nuevo código de verificación.',
        });
      }

      // Return the generated code if everything is successful
      this.logger.log(
        `Código generado exitosamente para el usuario ${user_cod}.`,
      );
      return code;
    } catch (error) {
      this.logger.error(`Error al generar el código: ${error.message}`);

      if (error instanceof RpcException) {
        throw error; // Re-throw known RpcException
      }

      throw new RpcException({
        status: 500,
        message: `Error inesperado al generar el código: ${error.message || error}`,
      });
    }
  }

  async validateCode(validateCodeDto: ValidateCodeDto) {
    try {
      const isValid = await this.databaseService.validateCode(validateCodeDto);

      if (!isValid) {
        throw new RpcException({
          status: 400,
          message: 'Código incorrecto o no válido.',
        });
      }

      return this.response.success('', '', 'Código validado con éxito.');
    } catch (error) {
      this.logger.error(
        `Error durante la validación del código: ${error.message}`,
      );

      if (error instanceof RpcException) {
        throw error; // Re-throw known RpcException
      }

      throw new RpcException({
        status: 500,
        message: `Error inesperado durante la validación del código: ${error.message || error}`,
      });
    }
  }
}
