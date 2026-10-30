/** Seam: loadSettings(), which turns environment variables into checked settings. */
import { describe, expect, it } from 'vitest';

import { SettingsError, loadSettings } from '../src/config';

const VALID_ENVIRONMENT = { API_URL: 'http://api.internal:3001' };

describe('loadSettings', () => {
  /** The web app gets the API's address, a port number and a log level it can use. */
  it('gives typed settings from valid variables', () => {
    expect(loadSettings({ ...VALID_ENVIRONMENT, PORT: '4000', LOG_LEVEL: 'warn' })).toEqual({
      API_URL: 'http://api.internal:3001',
      PORT: 4000,
      LOG_LEVEL: 'warn',
    });
  });

  /** LOG_LEVEL is optional: without it, the web app logs at its normal level. */
  it('defaults the log level to info', () => {
    expect(loadSettings(VALID_ENVIRONMENT).LOG_LEVEL).toBe('info');
  });

  /** PORT is optional: without it, the web app uses Next.js's usual port. */
  it('defaults the port to 3000', () => {
    expect(loadSettings(VALID_ENVIRONMENT).PORT).toBe(3000);
  });

  /** An impossible port is caught by us, not left to Next.js, which would exit with status 0. */
  it('names a port outside 1–65535 in the error', () => {
    expect(() => loadSettings({ ...VALID_ENVIRONMENT, PORT: '70000' })).toThrow(/PORT/);
  });

  /** A missing variable stops the web app with its name, so the fix is obvious. */
  it('names a missing variable in the error', () => {
    expect(() => loadSettings({})).toThrow(
      expect.objectContaining({
        name: SettingsError.name,
        message: expect.stringContaining('API_URL'),
      }),
    );
  });

  /** A level the web app doesn't know is caught at startup, with the variable's name. */
  it('names an unknown log level in the error', () => {
    expect(() => loadSettings({ ...VALID_ENVIRONMENT, LOG_LEVEL: 'loud' })).toThrow(/LOG_LEVEL/);
  });

  /** The error ends up in the logs, so it must never carry a value like a password. */
  it('never puts a value, such as a password, in the error', () => {
    const environment = { API_URL: 'ftp://kivu:hunter2@api.internal' };

    expect(() => loadSettings(environment)).toThrow(
      expect.objectContaining({ message: expect.not.stringContaining('hunter2') }),
    );
  });
});
