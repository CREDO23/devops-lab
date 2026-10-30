/** Seam: loadSettings(), which turns environment variables into checked settings. */
import { describe, expect, it } from 'vitest';

import { SettingsError, loadSettings } from '../src/config.js';

const VALID_ENVIRONMENT = {
  DATABASE_URL: 'postgresql://kivu:secret@db.internal:5432/kivu',
  VALKEY_URL: 'redis://cache.internal:6379/0',
  PORT: '3001',
};

describe('loadSettings', () => {
  /** Environment variables are text; the API gets URLs and a port number it can use. */
  it('gives typed settings from valid variables', () => {
    expect(loadSettings({ ...VALID_ENVIRONMENT, LOG_LEVEL: 'warn' })).toEqual({
      DATABASE_URL: 'postgresql://kivu:secret@db.internal:5432/kivu',
      VALKEY_URL: 'redis://cache.internal:6379/0',
      PORT: 3001,
      LOG_LEVEL: 'warn',
    });
  });

  /** LOG_LEVEL is optional: without it, the API logs at its normal level. */
  it('defaults the log level to info', () => {
    expect(loadSettings(VALID_ENVIRONMENT).LOG_LEVEL).toBe('info');
  });

  /** A level the API doesn't know is caught at startup, with the variable's name. */
  it('names an unknown log level in the error', () => {
    expect(() => loadSettings({ ...VALID_ENVIRONMENT, LOG_LEVEL: 'loud' })).toThrow(/LOG_LEVEL/);
  });

  /** A missing variable stops the API with its name, so the fix is obvious. */
  it('names a missing variable in the error', () => {
    const { DATABASE_URL: _, ...withoutDatabaseUrl } = VALID_ENVIRONMENT;

    expect(() => loadSettings(withoutDatabaseUrl)).toThrow(
      expect.objectContaining({
        name: SettingsError.name,
        message: expect.stringContaining('DATABASE_URL'),
      }),
    );
  });

  /** An impossible port is caught at startup, not later when the server fails to open it. */
  it('names a port outside 1–65535 in the error', () => {
    expect(() => loadSettings({ ...VALID_ENVIRONMENT, PORT: '70000' })).toThrow(/PORT/);
  });

  /** The error ends up in the logs, so it must never carry a value like a password. */
  it('never puts a value, such as a password, in the error', () => {
    const environment = {
      ...VALID_ENVIRONMENT,
      DATABASE_URL: 'mysql://kivu:hunter2@db.internal/kivu',
    };

    expect(() => loadSettings(environment)).toThrow(
      expect.objectContaining({ message: expect.not.stringContaining('hunter2') }),
    );
  });
});
