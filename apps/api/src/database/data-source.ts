import { DataSource } from 'typeorm';
import { validateEnv } from '../config/env.validation.js';

// Used by the TypeORM CLI only (see migration:* scripts, which load .env).
const env = validateEnv(process.env);

export default new DataSource({
  type: 'postgres',
  host: env.DATABASE_HOST,
  port: env.DATABASE_PORT,
  username: env.DATABASE_USER,
  password: env.DATABASE_PASSWORD,
  database: env.DATABASE_NAME,
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
});
