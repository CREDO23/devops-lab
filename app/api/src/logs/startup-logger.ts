/** For the moments before NestJS runs, like refusing bad settings. */
import { pino } from 'pino';

import { loggerOptions } from './log-format.js';

export const startupLogger = pino(loggerOptions('info'));
