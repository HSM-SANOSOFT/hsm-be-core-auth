import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';

import { AppService } from './app.service';

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);
  constructor(private readonly appService: AppService) {}

  @MessagePattern('pinGeneration')
  async pinGeneration(
    @Payload()
    data: {
      idDocs: string;
      TIPO: string;
      ip: string;
    },
  ) {
    const response = await this.appService.pinGeneration(data);
    this.logger.log(response);
    return response;
  }

  @MessagePattern('pinValidation')
  async pinValidation(
    @Payload()
    data: {
      idDocs: string;
      TIPO: string;
      NUMERO_RECIBIDO: number;
      ip: string;
    },
  ) {
    const response = await this.appService.pinValidation(data);
    this.logger.log(response);
    return response;
  }
}
