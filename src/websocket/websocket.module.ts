import { Module } from '@nestjs/common';

import { Websocket } from './websocket';

@Module({
  providers: [Websocket],
  exports: [Websocket],
})
export class WebsocketModule {}
