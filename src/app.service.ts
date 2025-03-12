import { Injectable, Logger } from '@nestjs/common';

import { DatabaseService } from './database/database.service';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);
  constructor(private readonly databaseService: DatabaseService) {}

  async pinGeneration(data: { idDocs: string; TIPO: string; ip: string }) {
    const fecha = new Date();

    const pinLength = 6;
    const pinMin = 10 ** (pinLength - 1);
    const pinMax = 9 * 10 ** (pinLength - 1);
    const pin = Math.floor(pinMin + Math.random() * pinMax);
    return await this.databaseService.pinGeneration({ ...data, fecha, pin });
  }
}
