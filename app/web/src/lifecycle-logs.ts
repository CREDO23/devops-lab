import { type Settings, SettingsError, loadSettings } from '@/config';
import { createLogger } from '@/logs';
import { runningVersion } from '@/version';

// Also covers Next.js started directly, without the check in `pnpm start`.
function settingsOrExit(): Settings {
  try {
    return loadSettings(process.env);
  } catch (error) {
    if (!(error instanceof SettingsError)) throw error;
    createLogger('info').error({ reason: error.message }, 'web cannot start');
    process.exit(1);
  }
}

export function logLifecycle(): void {
  const log = createLogger(settingsOrExit().LOG_LEVEL);
  log.info({ version: runningVersion() }, 'web started');
  // Runs only once in-flight requests are done: proof the shutdown was graceful.
  process.on('exit', () => log.info('web stopped'));
}
