import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';

import { runningVersion } from '../version/index.js';

@Injectable()
export class LifecycleLogs implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger('Api');

  onApplicationBootstrap(): void {
    this.logger.log({ version: runningVersion() }, 'api started');
  }

  onApplicationShutdown(): void {
    // Runs once the HTTP server has closed and in-flight requests are done.
    this.logger.log('api stopped');
  }
}
