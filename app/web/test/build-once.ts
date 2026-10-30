/** Builds the web app once before the tests, so they run the current build. */
import { execFileSync } from 'node:child_process';

export default function buildOnce(): void {
  execFileSync('pnpm', ['--silent', 'build'], { stdio: 'inherit' });
}
