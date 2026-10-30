/** Builds the API app from checked settings; main.ts and the tests share it. */
import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module.js';
import type { Settings } from './config.js';

export async function createApi(settings: Settings): Promise<INestApplication> {
  const api = await NestFactory.create(AppModule.forRoot(settings), { bufferLogs: true });
  api.useLogger(api.get(Logger));
  api.setGlobalPrefix('api', { exclude: ['livez', 'readyz', 'version'] });
  return api;
}
