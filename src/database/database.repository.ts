import { Injectable } from '@nestjs/common';

import { PdpLogSegundaVerificacionRepository } from './repositories';

@Injectable()
export class DatabaseRepository {
  constructor(
    public pdpLogSegundaVerificacionRepository: PdpLogSegundaVerificacionRepository,
  ) {}
}
