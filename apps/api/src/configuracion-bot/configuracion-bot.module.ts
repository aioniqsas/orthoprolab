import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfiguracionBot } from './configuracion-bot.entity.js';
import { ConfiguracionBotController } from './configuracion-bot.controller.js';
import { ConfiguracionBotService } from './configuracion-bot.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([ConfiguracionBot])],
  controllers: [ConfiguracionBotController],
  providers: [ConfiguracionBotService],
})
export class ConfiguracionBotModule {}
