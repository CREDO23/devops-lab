import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module.js';
import type { Settings } from './config.js';

export async function createApi(settings: Settings): Promise<INestApplication> {
  const api = await NestFactory.create(AppModule.forRoot(settings), { bufferLogs: true });
  api.useLogger(api.get(Logger));
  // Outside /api: the proxy only routes /api, so these can't be reached from the internet.
  api.setGlobalPrefix('api', { exclude: ['livez', 'readyz', 'version'] });
  return api;
}
