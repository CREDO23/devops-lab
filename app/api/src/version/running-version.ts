import { readFileSync } from 'node:fs';

// The same relative path works from src/ in tests and from dist/ once built.
const packageJson = JSON.parse(
  readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
) as { version: string };

export function runningVersion(): string {
  return packageJson.version;
}
