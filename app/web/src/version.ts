import packageJson from '../package.json';

export function runningVersion(): string {
  return packageJson.version;
}
