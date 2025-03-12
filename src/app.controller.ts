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
    return await this.appService.pinGeneration(data);
  }

  @MessagePattern('pinValidation')
  pinValidation(
    @Payload()
    data: {
      idDocs: string;
      TIPO: string;
      NUMERO_ENVIADO: number;
      ip: string;
    },
  ) {
    return data;
  }
}
