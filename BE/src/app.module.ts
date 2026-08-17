import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './provider/prisma/prisma.module';
import { ScheduleModule } from './schedule/schedule.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, ScheduleModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
