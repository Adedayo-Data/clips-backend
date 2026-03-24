import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ClipsModule } from './clips/clips.module';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    ClipsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
