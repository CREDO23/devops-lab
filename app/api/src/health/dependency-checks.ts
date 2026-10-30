import { Inject, Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';
import pg from 'pg';

import { HEALTH_OPTIONS } from './health-module-definition.js';
import type { HealthOptions } from './health-options.js';

// A hanging dependency must not hang /readyz: it always answers within a second.
const CHECK_TIMEOUT_MS = 500;

@Injectable()
export class DependencyChecks {
  constructor(@Inject(HEALTH_OPTIONS) private readonly options: HealthOptions) {}

  async failingDependencies(): Promise<string[]> {
    const [postgresOk, valkeyOk] = await Promise.all([
      this.postgresAnswers(),
      this.valkeyAnswers(),
    ]);
    const results: [string, boolean][] = [
      ['postgres', postgresOk],
      ['valkey', valkeyOk],
    ];
    return results.filter(([, ok]) => !ok).map(([name]) => name);
  }

  private async postgresAnswers(): Promise<boolean> {
    const client = new pg.Client({ connectionString: this.options.databaseUrl });
    try {
      await withinTimeout(client.connect().then(() => client.query('SELECT 1')));
      return true;
    } catch {
      return false;
    } finally {
      void client.end().catch(() => undefined);
    }
  }

  private async valkeyAnswers(): Promise<boolean> {
    const client = new Redis(this.options.valkeyUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 0,
      retryStrategy: () => null,
    });
    // Failures surface through the ping below; without a listener, ioredis would crash the API.
    client.on('error', () => undefined);
    try {
      await withinTimeout(client.connect().then(() => client.ping()));
      return true;
    } catch {
      return false;
    } finally {
      client.disconnect();
    }
  }
}

function withinTimeout<T>(work: Promise<T>): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('timed out')), CHECK_TIMEOUT_MS).unref();
  });
  return Promise.race([work, timeout]);
}
