/** Runs before Next.js, from `pnpm start` and `pnpm dev`. */
import { SettingsError, loadSettings } from './config.ts';
import { createLogger } from './logs.ts';

try {
  loadSettings(process.env);
} catch (error) {
  if (!(error instanceof SettingsError)) throw error;
  createLogger('info').error({ reason: error.message }, 'web cannot start');
  process.exit(1);
}
