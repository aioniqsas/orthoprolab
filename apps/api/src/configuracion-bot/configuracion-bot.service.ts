import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfiguracionBot } from './configuracion-bot.entity.js';

/** Fallback documentado: si la fila falta o es ilegible, el bot se llama así. */
export const NOMBRE_BOT_POR_DEFECTO = 'Aioniq';

const CLAVE_NOMBRE = 'nombre';

@Injectable()
export class ConfiguracionBotService {
  constructor(
    @InjectRepository(ConfiguracionBot)
    private readonly repo: Repository<ConfiguracionBot>,
  ) {}

  async getNombre(): Promise<{ nombre: string }> {
    const fila = await this.repo.findOne({ where: { clave: CLAVE_NOMBRE } });
    return { nombre: fila?.valor ?? NOMBRE_BOT_POR_DEFECTO };
  }

  async guardarNombre(nombre: string): Promise<{ nombre: string }> {
    await this.repo.save({ clave: CLAVE_NOMBRE, valor: nombre });
    return { nombre };
  }
}
