/** Seam: the web process itself, the built app started for real, as an operator would. */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { NEXT, WEB_DIRECTORY, environment, startWeb, stopWeb } from './running-web';

// Next.js prints these few plain-text lines itself; only a custom server could change them.
const NEXT_OWN_LINE = /^(▲|- |✓|\s*$)/;

function ourLines(output: string): string[] {
  return output.split('\n').filter((line) => !NEXT_OWN_LINE.test(line));
}

function isJsonObject(line: string): boolean {
  try {
    const parsed: unknown = JSON.parse(line);
    return typeof parsed === 'object' && parsed !== null;
  } catch {
    return false;
  }
}

function logEvents(output: string): Record<string, unknown>[] {
  return ourLines(output)
    .filter(isJsonObject)
    .map((line) => JSON.parse(line) as Record<string, unknown>);
}

describe('the web process', () => {
  /**
   * Empty rather than unset: Next.js would fill an unset variable from a local .env, so the
   * result would depend on whose machine runs the test.
   */
  it('refuses to start with an empty variable, and names it', () => {
    const result = spawnSync(process.execPath, [NEXT, 'start', '-H', '127.0.0.1', '-p', '0'], {
      cwd: WEB_DIRECTORY,
      env: environment({ API_URL: '' }),
      encoding: 'utf8',
      timeout: 30_000,
    });

    expect([result.status !== 0, `${result.stdout}${result.stderr}`]).toEqual([
      true,
      expect.stringContaining('API_URL'),
    ]);
  });

  /** Every line we write is JSON, so log tools can read it; Next's own start lines are the limit. */
  it('writes its own lines as JSON', async () => {
    const web = await startWeb();
    await stopWeb(web);

    const lines = ourLines(web.output());
    expect(lines.length > 0 && lines.every(isJsonObject)).toBe(true);
  });

  /** The start is logged with the version, so the logs show which version ran when. */
  it('logs its start with the running version', async () => {
    const packageJson = JSON.parse(
      readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
    ) as { version: string };
    const web = await startWeb();
    await stopWeb(web);

    expect(logEvents(web.output())).toContainEqual(
      expect.objectContaining({ event: 'web started', version: packageJson.version }),
    );
  });

  /** On SIGTERM, the web app finishes in-flight work and logs "web stopped" within 5 s. */
  it('finishes its shutdown on SIGTERM', async () => {
    const web = await startWeb();
    await stopWeb(web);

    expect(logEvents(web.output())).toContainEqual(
      expect.objectContaining({ event: 'web stopped' }),
    );
  });

  /** With LOG_LEVEL=warn, routine lines like "web started" stay out of the logs. */
  it('drops info lines at a higher log level', async () => {
    const web = await startWeb({ LOG_LEVEL: 'warn' });
    await stopWeb(web);

    expect(logEvents(web.output())).not.toContainEqual(
      expect.objectContaining({ event: 'web started' }),
    );
  });
});
