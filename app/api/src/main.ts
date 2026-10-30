import { createApi } from './api.js';
import { type Settings, SettingsError, loadSettings } from './config.js';
import { startupLogger } from './logs/index.js';

function settingsOrExit(): Settings {
  try {
    return loadSettings(process.env);
  } catch (error) {
    if (!(error instanceof SettingsError)) throw error;
    startupLogger.error({ reason: error.message }, 'api cannot start');
    process.exit(1);
  }
}

const settings = settingsOrExit();
const api = await createApi(settings);
api.enableShutdownHooks();
await api.listen(settings.PORT, '127.0.0.1'); // never reachable from the network
