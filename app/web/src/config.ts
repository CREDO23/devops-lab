import { z } from 'zod';

// A relative path with its extension: plain Node runs this file in check-settings.ts.
import { LOG_LEVELS } from './logs.ts';

const settingsSchema = z.object({
  API_URL: z.url({ protocol: /^https?$/ }),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  LOG_LEVEL: z.enum(LOG_LEVELS).default('info'),
});

export type Settings = z.infer<typeof settingsSchema>;

export class SettingsError extends Error {
  override name = 'SettingsError';
}

export function loadSettings(environment: Record<string, string | undefined>): Settings {
  const result = settingsSchema.safeParse(environment);
  if (!result.success) {
    // Names and reasons only, never values: a URL can carry a password.
    const problems = result.error.issues.map(
      (issue) => `${issue.path.join('.')}: ${issue.message}`,
    );
    throw new SettingsError(`Invalid configuration: ${problems.join('; ')}`);
  }
  return result.data;
}
