import { type DynamicModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';

import type { Settings } from './config.js';
import { HealthModule } from './health/index.js';
import { LifecycleLogs, requestLogOptions } from './logs/index.js';
import { VersionModule } from './version/index.js';

@Module({})
export class AppModule {
  static forRoot(settings: Settings): DynamicModule {
    return {
      module: AppModule,
      imports: [
        // Settings arrive already checked; the API never reads process.env past startup.
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          skipProcessEnv: true,
          load: [() => settings],
        }),
        HealthModule.registerAsync({
          inject: [ConfigService],
          useFactory: (config: ConfigService<Settings, true>) => ({
            databaseUrl: config.get('DATABASE_URL', { infer: true }),
            valkeyUrl: config.get('VALKEY_URL', { infer: true }),
          }),
        }),
        LoggerModule.forRoot({ pinoHttp: requestLogOptions(settings.LOG_LEVEL) }),
        VersionModule,
      ],
      providers: [LifecycleLogs],
    };
  }
}
