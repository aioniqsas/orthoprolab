import { Module } from '@nestjs/common';
import { UsuariosController } from './usuarios.controller.js';
import { UsuariosModule } from './usuarios.module.js';

// API module — safe to import auth guards/decorators here since AuthModule
// does NOT import this module, only the pure UsuariosModule above.
@Module({
  imports: [UsuariosModule],
  controllers: [UsuariosController],
})
export class UsuariosApiModule {}
