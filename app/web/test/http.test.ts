/** Seam: the built web app over HTTP, started for real on a free port. */
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { type RunningWeb, startWeb, stopWeb } from './running-web';

describe('the web app over HTTP', () => {
  let web: RunningWeb;

  beforeAll(async () => {
    web = await startWeb();
  });

  afterAll(async () => {
    await stopWeb(web);
  });

  /** Liveness only says the process answers: nothing else may get the web app restarted. */
  it('is alive', async () => {
    const response = await fetch(`${web.url}/livez`);

    expect(response.status).toBe(200);
  });

  /** The API is unreachable here: its outage must not take the whole website offline. */
  it('is ready even when the API is down', async () => {
    const response = await fetch(`${web.url}/readyz`);

    expect([response.status, await response.json()]).toEqual([200, { status: 'ready' }]);
  });

  /** /version reports what package.json declares, read here independently of the code. */
  it('reports the version declared in package.json', async () => {
    const packageJson = JSON.parse(
      readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
    ) as { version: string };

    const response = await fetch(`${web.url}/version`);

    expect(await response.json()).toEqual({ version: packageJson.version });
  });

  /**
   * /api goes to the API found at API_URL, given only when the web app starts, never at build
   * time: one build runs everywhere. Path, query and cookies must arrive intact.
   */
  it('forwards /api to the API', async () => {
    const fakeApi = createServer((request, response) => {
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify({ url: request.url, cookie: request.headers.cookie }));
    });
    await new Promise<void>((resolve) => fakeApi.listen(0, '127.0.0.1', resolve));
    const { port } = fakeApi.address() as AddressInfo;
    const webWithApi = await startWeb({ API_URL: `http://127.0.0.1:${port}` });

    try {
      const response = await fetch(`${webWithApi.url}/api/trips?from=goma`, {
        headers: { cookie: 'session=abc' },
      });

      expect(await response.json()).toEqual({
        url: '/api/trips?from=goma',
        cookie: 'session=abc',
      });
    } finally {
      await stopWeb(webWithApi);
      fakeApi.close();
    }
  });
});
