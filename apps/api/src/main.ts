import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { APP_CREATE_OPTIONS, configureApp } from './app.setup.js';
import { describirCpu } from './config/cpu-cuota.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(
    AppModule,
    APP_CREATE_OPTIONS,
  );
  configureApp(app);
  app.enableShutdownHooks();
  await app.listen(Number(process.env.PORT ?? 3003), '0.0.0.0');
  // Makes the CPU this instance really gets visible in the logs (optimizacion P4).
  console.log(`[boot] ${describirCpu()}`);
}
await bootstrap();
