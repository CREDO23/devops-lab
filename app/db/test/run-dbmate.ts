import { spawnSync } from 'node:child_process';

export const DB_DIRECTORY = new URL('..', import.meta.url).pathname;

export function runDbmate(
  args: string[],
  env: NodeJS.ProcessEnv,
  cwd: string = DB_DIRECTORY,
): { status: number | null; output: string } {
  const result = spawnSync(`${DB_DIRECTORY}run-dbmate.sh`, args, {
    cwd,
    env: { ...process.env, ...env },
    encoding: 'utf8',
  });
  return { status: result.status, output: `${result.stdout}${result.stderr}` };
}
