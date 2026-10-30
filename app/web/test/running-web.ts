/** Starts and stops the built web app for real, on a free port, for the tests that need it. */
import { type ChildProcess, spawn } from 'node:child_process';
import { createServer } from 'node:net';

export const NEXT = new URL('../node_modules/next/dist/bin/next', import.meta.url).pathname;
export const WEB_DIRECTORY = new URL('..', import.meta.url).pathname;

const SETTINGS = ['API_URL', 'LOG_LEVEL', 'PORT'];

export interface RunningWeb {
  process: ChildProcess;
  url: string;
  output: () => string;
}

/** Starts from a clean slate, so variables set in the developer's shell can't leak in. */
export function environment(overrides: Record<string, string>): NodeJS.ProcessEnv {
  const clean: NodeJS.ProcessEnv = { ...process.env, NEXT_TELEMETRY_DISABLED: '1' };
  for (const name of SETTINGS) delete clean[name];
  return { ...clean, ...overrides };
}

async function freePort(): Promise<number> {
  const probe = createServer();
  await new Promise<void>((resolve) => probe.listen(0, '127.0.0.1', resolve));
  const address = probe.address();
  await new Promise((resolve) => probe.close(resolve));
  if (address === null || typeof address === 'string') throw new Error('no port');
  return address.port;
}

export async function startWeb(settings: Record<string, string> = {}): Promise<RunningWeb> {
  const port = await freePort();
  const web = spawn(process.execPath, [NEXT, 'start', '-H', '127.0.0.1', '-p', String(port)], {
    cwd: WEB_DIRECTORY,
    // Port 1 is closed: a real, unreachable API with nothing mocked.
    env: environment({ API_URL: 'http://127.0.0.1:1', ...settings }),
  });
  let output = '';
  web.stdout?.on('data', (chunk: Buffer) => (output += chunk.toString()));
  web.stderr?.on('data', (chunk: Buffer) => (output += chunk.toString()));

  const url = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(`${url}/livez`)).ok) return { process: web, url, output: () => output };
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  web.kill('SIGKILL');
  throw new Error(`the web app didn't start within 15 seconds:\n${output}`);
}

export async function stopWeb(web: RunningWeb): Promise<void> {
  const exited = new Promise((resolve) => web.process.once('exit', resolve));
  web.process.kill('SIGTERM');
  await Promise.race([
    exited,
    new Promise((_, reject) => setTimeout(() => reject(new Error('no exit within 5 s')), 5_000)),
  ]);
}
