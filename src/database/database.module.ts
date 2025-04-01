import { Module } from '@nestjs/common';

import { databaseProviders } from './database.provider';
import { DatabaseRepository } from './database.repository';
import { DatabaseService } from './database.service';
import { DatabaseRepositories } from './repositories';

@Module({
  providers: [
    ...databaseProviders,
    DatabaseRepository,
    DatabaseService,
    ...DatabaseRepositories,
  ],
  exports: [DatabaseService, DatabaseRepository],
})
export class DatabaseModule {}
