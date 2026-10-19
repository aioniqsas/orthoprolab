import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { APP_CREATE_OPTIONS, configureApp } from './app.setup.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(
    AppModule,
    APP_CREATE_OPTIONS,
  );
  configureApp(app);
  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 3003);
}
await bootstrap();
