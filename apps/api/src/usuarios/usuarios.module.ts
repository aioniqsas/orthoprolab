import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AsistenteDoctor } from './asistente-doctor.entity.js';
import { Clinica } from './clinica.entity.js';
import { Doctor } from './doctor.entity.js';
import { Rol } from './rol.entity.js';
import { Usuario } from './usuario.entity.js';
import { UsuariosService } from './usuarios.service.js';

// Pure data module — imported by AuthModule. No auth imports allowed here.
@Module({
  imports: [
    TypeOrmModule.forFeature([Rol, Usuario, Clinica, Doctor, AsistenteDoctor]),
  ],
  providers: [UsuariosService],
  exports: [TypeOrmModule, UsuariosService],
})
export class UsuariosModule {}
