import { Module } from '@nestjs/common';

import { databaseProviders } from './database.provider';
import { DatabaseService } from './database.service';

@Module({
  providers: [...databaseProviders, DatabaseService],
  exports: [...databaseProviders, DatabaseService],
})
export class DatabaseModule {}
