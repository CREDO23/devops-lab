/** The levels operators can choose, and the JSON shape of every line: the worker's fields. */
import type { LoggerOptions } from 'pino';

// The same names as the worker's, so operators use one vocabulary everywhere.
export const LOG_LEVELS = ['debug', 'info', 'warn', 'error', 'silent'] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

export function loggerOptions(level: LogLevel): LoggerOptions {
  return {
    level,
    messageKey: 'event',
    base: undefined,
    timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
    formatters: { level: (label) => ({ level: label }) },
  };
}
