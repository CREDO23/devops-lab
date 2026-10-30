/** Seam: the API process itself, the compiled build started for real, as an operator would. */
import { type ChildProcess, spawn, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:net';

import { describe, expect, it } from 'vitest';

const API = [new URL('../dist/main.js', import.meta.url).pathname];
const SETTINGS = ['DATABASE_URL', 'VALKEY_URL', 'PORT', 'LOG_LEVEL'];

async function freePort(): Promise<number> {
  const probe = createServer();
  await new Promise<void>((resolve) => probe.listen(0, '127.0.0.1', resolve));
  const address = probe.address();
  await new Promise((resolve) => probe.close(resolve));
  if (address === null || typeof address === 'string') throw new Error('no port');
  return address.port;
}

function environment(overrides: Record<string, string>): NodeJS.ProcessEnv {
  // Starts from a clean slate so variables set in the developer's shell can't leak in.
  const base = Object.fromEntries(
    Object.entries(process.env).filter(([name]) => !SETTINGS.includes(name)),
  );
  return { ...base, ...overrides };
}

async function startApi(
  extraSettings: Record<string, string> = {},
): Promise<{ api: ChildProcess; port: number; output: () => string }> {
  const port = await freePort();
  const api = spawn(process.execPath, API, {
    env: environment({
      DATABASE_URL: 'postgresql://kivu:kivu@127.0.0.1:1/kivu',
      VALKEY_URL: 'redis://127.0.0.1:1/0',
      PORT: String(port),
      ...extraSettings,
    }),
  });
  let output = '';
  api.stdout?.on('data', (chunk: Buffer) => (output += chunk.toString()));
  api.stderr?.on('data', (chunk: Buffer) => (output += chunk.toString()));

  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(`http://127.0.0.1:${port}/livez`)).ok) {
        return { api, port, output: () => output };
      }
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  api.kill('SIGKILL');
  throw new Error(`the API didn't start within 10 seconds:\n${output}`);
}

async function stopApi(api: ChildProcess): Promise<void> {
  const exited = new Promise((resolve) => api.once('exit', resolve));
  api.kill('SIGTERM');
  await Promise.race([
    exited,
    new Promise((_, reject) => setTimeout(() => reject(new Error('no exit within 5 s')), 5_000)),
  ]);
}

function logEvents(output: string): Record<string, unknown>[] {
  return output
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => JSON.parse(line) as Record<string, unknown>);
}

describe('the API process', () => {
  /** Started without DATABASE_URL, the API refuses to start and its output names it. */
  it('refuses to start without a variable, and names it', () => {
    const result = spawnSync(process.execPath, API, {
      env: environment({ VALKEY_URL: 'redis://127.0.0.1:1/0', PORT: '3001' }),
      encoding: 'utf8',
      timeout: 30_000,
    });

    expect([result.status !== 0, `${result.stdout}${result.stderr}`]).toEqual([
      true,
      expect.stringContaining('DATABASE_URL'),
    ]);
  });

  /** Every line the API writes, NestJS's own included, is JSON, so log tools can read it. */
  it('writes only JSON lines', async () => {
    const { api, output } = await startApi();
    await stopApi(api);

    const lines = output()
      .split('\n')
      .filter((line) => line.trim() !== '');
    expect(lines.every((line) => isJsonObject(line)) && lines.length > 0).toBe(true);
  });

  /** The start is logged with the version, so the logs show which version ran when. */
  it('logs its start with the running version', async () => {
    const packageJson = JSON.parse(
      readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
    ) as { version: string };
    const { api, output } = await startApi();
    await stopApi(api);

    expect(logEvents(output())).toContainEqual(
      expect.objectContaining({ event: 'api started', version: packageJson.version }),
    );
  });

  /** On SIGTERM, the API finishes in-flight work and logs "api stopped" within 5 s. */
  it('finishes its shutdown on SIGTERM', async () => {
    const { api, output } = await startApi();
    await stopApi(api);

    expect(logEvents(output())).toContainEqual(expect.objectContaining({ event: 'api stopped' }));
  });

  /** Request logs never carry headers: from sign-in on, those hold cookies and tokens. */
  it('never logs request headers such as cookies', async () => {
    const { api, port, output } = await startApi();
    await fetch(`http://127.0.0.1:${port}/version`, {
      headers: { cookie: 'session=do-not-log-me' },
    });
    await stopApi(api);

    expect(output()).not.toContain('do-not-log-me');
  });

  /** Health probes come every few seconds; logging them would bury every other request. */
  it('logs requests, but not health probes', async () => {
    const { api, port, output } = await startApi();
    await fetch(`http://127.0.0.1:${port}/readyz`);
    await fetch(`http://127.0.0.1:${port}/version`);
    await stopApi(api);

    const loggedUrls = logEvents(output())
      .map((event) => (event.req as { url?: string } | undefined)?.url)
      .filter((url) => url !== undefined);
    expect(loggedUrls).toEqual(['/version']);
  });

  /** With LOG_LEVEL=warn, routine lines like "api started" stay out of the logs. */
  it('drops info lines at a higher log level', async () => {
    const { api, output } = await startApi({ LOG_LEVEL: 'warn' });
    await stopApi(api);

    expect(logEvents(output())).not.toContainEqual(
      expect.objectContaining({ event: 'api started' }),
    );
  });
});

function isJsonObject(line: string): boolean {
  try {
    const parsed: unknown = JSON.parse(line);
    return typeof parsed === 'object' && parsed !== null;
  } catch {
    return false;
  }
}
