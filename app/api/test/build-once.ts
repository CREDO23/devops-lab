/** Builds the API once before the tests, so the process tests run the current dist/main.js. */
import { execFileSync } from 'node:child_process';

export default function buildOnce(): void {
  execFileSync('pnpm', ['--silent', 'build'], { stdio: 'inherit' });
}
