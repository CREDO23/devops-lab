import { z } from 'zod';

import { LOG_LEVELS } from './logs/index.js';

const settingsSchema = z.object({
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  // Valkey speaks the Redis protocol, so its URL is a Redis URL.
  VALKEY_URL: z.url({ protocol: /^rediss?$/ }),
  PORT: z.coerce.number().int().min(1).max(65535),
  LOG_LEVEL: z.enum(LOG_LEVELS).default('info'),
});

export type Settings = z.infer<typeof settingsSchema>;

export class SettingsError extends Error {
  override name = 'SettingsError';
}

export function loadSettings(environment: Record<string, string | undefined>): Settings {
  const result = settingsSchema.safeParse(environment);
  if (!result.success) {
    // Names and reasons only, never values: DATABASE_URL carries a password.
    const problems = result.error.issues.map(
      (issue) => `${issue.path.join('.')}: ${issue.message}`,
    );
    throw new SettingsError(`Invalid configuration: ${problems.join('; ')}`);
  }
  return result.data;
}
