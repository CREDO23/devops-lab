/** Seam: the settings check, the step `pnpm start` and `pnpm dev` run before Next.js starts. */
import { spawnSync } from 'node:child_process';

import { describe, expect, it } from 'vitest';

import { WEB_DIRECTORY, environment } from './running-web';

function runCheck(settings: Record<string, string>) {
  return spawnSync(process.execPath, ['src/check-settings.ts'], {
    cwd: WEB_DIRECTORY,
    env: environment(settings),
    encoding: 'utf8',
    timeout: 30_000,
  });
}

describe('the settings check', () => {
  /** Good settings let the start carry on, without adding any noise to the logs. */
  it('stays silent and succeeds with good settings', () => {
    const result = runCheck({ API_URL: 'http://localhost:3001', PORT: '3000' });

    expect([result.status, `${result.stdout}${result.stderr}`]).toEqual([0, '']);
  });

  /** Plain Node doesn't read .env, so here a variable can truly be missing. */
  it('stops on a missing variable, and names it as a JSON line', () => {
    const result = runCheck({ PORT: '3000' });

    expect([result.status, JSON.parse(result.stdout)]).toEqual([
      1,
      expect.objectContaining({
        event: 'web cannot start',
        reason: expect.stringContaining('API_URL'),
      }),
    ]);
  });

  /** Left to Next.js, an impossible port gives an unhandled error and exit status 0. */
  it('stops on an impossible port, and names it as a JSON line', () => {
    const result = runCheck({ API_URL: 'http://localhost:3001', PORT: '70000' });

    expect([result.status, JSON.parse(result.stdout)]).toEqual([
      1,
      expect.objectContaining({
        event: 'web cannot start',
        reason: expect.stringContaining('PORT'),
      }),
    ]);
  });
});
