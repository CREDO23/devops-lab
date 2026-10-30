/**
 * Seam: the API's HTTP endpoints, through the real NestJS app.
 *
 * Tests using `runningServices()` need a real Postgres and Valkey, found through
 * TEST_DATABASE_URL and TEST_VALKEY_URL.
 */
import { readFileSync } from 'node:fs';

import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApi } from '../src/api.js';
import { type Settings, loadSettings } from '../src/config.js';

// Port 1 is closed: connections are refused at once, a real failure with nothing mocked.
const UNREACHABLE = loadSettings({
  DATABASE_URL: 'postgresql://kivu:kivu@127.0.0.1:1/kivu',
  VALKEY_URL: 'redis://127.0.0.1:1/0',
  PORT: '3001',
  LOG_LEVEL: 'silent',
});

function runningServices(): Settings {
  const missing = ['TEST_DATABASE_URL', 'TEST_VALKEY_URL'].filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(`Start Postgres and Valkey, then set ${missing.join(', ')}`);
  }
  return loadSettings({
    DATABASE_URL: process.env.TEST_DATABASE_URL,
    VALKEY_URL: process.env.TEST_VALKEY_URL,
    PORT: '3001',
    LOG_LEVEL: 'silent',
  });
}

async function get(path: string, settings: Settings): Promise<request.Response> {
  const api = await createApi(settings);
  await api.init();
  try {
    return await request(api.getHttpServer()).get(path);
  } finally {
    await api.close();
  }
}

describe('the API over HTTP', () => {
  /** Liveness ignores Postgres and Valkey: a database outage must not get the API restarted. */
  it('is alive even when its dependencies are down', async () => {
    const response = await get('/livez', UNREACHABLE);

    expect(response.status).toBe(200);
  });

  /** /version reports what package.json declares, read here independently of the code. */
  it('reports the version declared in package.json', async () => {
    const packageJson = JSON.parse(
      readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
    ) as { version: string };

    const response = await get('/version', UNREACHABLE);

    expect(response.body).toEqual({ version: packageJson.version });
  });

  /** With both Postgres and Valkey unreachable, /readyz says not ready and names both. */
  it('is not ready and names every dependency that is down', async () => {
    const response = await get('/readyz', UNREACHABLE);

    expect([response.status, response.body]).toEqual([
      503,
      { status: 'not ready', failing: ['postgres', 'valkey'] },
    ]);
  });

  /** With a real Postgres and Valkey answering, /readyz says ready. */
  it('is ready when Postgres and Valkey answer', async () => {
    const response = await get('/readyz', runningServices());

    expect([response.status, response.body]).toEqual([200, { status: 'ready' }]);
  });

  /** Only the dependency that is really down gets named, so you know where to look. */
  it('names only the dependency that is down', async () => {
    const valkeyDown = { ...runningServices(), VALKEY_URL: UNREACHABLE.VALKEY_URL };

    const response = await get('/readyz', valkeyDown);

    expect([response.status, response.body]).toEqual([
      503,
      { status: 'not ready', failing: ['valkey'] },
    ]);
  });
});
