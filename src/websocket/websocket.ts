import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { envs } from 'config';
import { Server, Socket } from 'socket.io';

@WebSocketGateway(envs.AUTH_WEBSOCKET_MICROSERVICE_PORT)
export class Websocket implements OnGatewayConnection, OnGatewayDisconnect {
  logger = new Logger('AUTH WEBSOCKET');

  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    this.logger.log(`Client Connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  logout(clientId: string) {
    const client = this.server.sockets.sockets.get(clientId);
    this.logger.log(`Client is :${client}`);
    if (client) {
      client.emit('logout', { action: 'logout' });
      this.logger.log(`Logout event sent to client: ${clientId}`);
    }
  }
}
