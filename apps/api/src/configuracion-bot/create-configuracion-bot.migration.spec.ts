import { describe, expect, it, vi } from 'vitest';
import { CreateConfiguracionBot1794516000000 } from '../database/migrations/1794516000000-CreateConfiguracionBot.js';

const makeRunner = () => {
  const queries: string[] = [];
  return {
    queries,
    queryRunner: { query: vi.fn(async (sql: string) => void queries.push(sql)) } as never,
  };
};

describe('CreateConfiguracionBot1794516000000', () => {
  it('up crea solo la tabla configuracion_bot y siembra la fila nombre', async () => {
    const { queryRunner, queries } = makeRunner();
    await new CreateConfiguracionBot1794516000000().up(queryRunner);
    expect(queries).toEqual([
      `CREATE TABLE "configuracion_bot" ("clave" varchar(64) NOT NULL, "valor" text NOT NULL, "actualizado_en" timestamptz NOT NULL DEFAULT now(), CONSTRAINT "PK_configuracion_bot" PRIMARY KEY ("clave"))`,
      `INSERT INTO "configuracion_bot" ("clave", "valor") VALUES ('nombre', 'Aioniq') ON CONFLICT ("clave") DO NOTHING`,
    ]);
  });

  it('down elimina la tabla', async () => {
    const { queryRunner, queries } = makeRunner();
    await new CreateConfiguracionBot1794516000000().down(queryRunner);
    expect(queries).toEqual([`DROP TABLE "configuracion_bot"`]);
  });
});
