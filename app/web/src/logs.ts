import { type Logger, pino } from 'pino';

// The same names as the other services', so operators use one vocabulary everywhere.
export const LOG_LEVELS = ['debug', 'info', 'warn', 'error', 'silent'] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

// The same fields as the other services' logs, so one query works across them.
export function createLogger(level: LogLevel): Logger {
  return pino({
    level,
    messageKey: 'event',
    base: undefined,
    timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
    formatters: { level: (label) => ({ level: label }) },
  });
}
