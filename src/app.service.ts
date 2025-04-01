import { Injectable, Logger } from '@nestjs/common';

import { DatabaseRepository } from './database/database.repository';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);
  constructor(private readonly databaseRepository: DatabaseRepository) {}

  async pinGeneration(data: { idDocs: string; TIPO: string; ip: string }) {
    const fecha = new Date();

    const pinLength = 6;
    const pinMin = 10 ** (pinLength - 1);
    const pinMax = 9 * 10 ** (pinLength - 1);
    const pin = Math.floor(pinMin + Math.random() * pinMax);
    return await this.databaseRepository.pdpLogSegundaVerificacionRepository.pinGeneration(
      { ...data, fecha, pin },
    );
  }

  async pinValidation(data: {
    idDocs: string;
    TIPO: string;
    NUMERO_RECIBIDO: number;
    ip: string;
  }) {
    return await this.databaseRepository.pdpLogSegundaVerificacionRepository.pinValidation(
      data,
    );
  }
}
