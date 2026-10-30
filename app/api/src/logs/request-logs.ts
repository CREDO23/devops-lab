/** Which requests get logged, and which parts of them. */
import type { IncomingMessage, ServerResponse } from 'node:http';

import type { Options } from 'pino-http';

import { type LogLevel, loggerOptions } from './log-format.js';

const HEALTH_PROBES = ['/livez', '/readyz'];

export function requestLogOptions(level: LogLevel): Options {
  return {
    ...loggerOptions(level),
    // Probes come every few seconds; logging them would bury every other request.
    autoLogging: { ignore: (request) => HEALTH_PROBES.includes(request.url ?? '') },
    // No headers: from sign-in on, they hold cookies and tokens.
    serializers: {
      req: (request: IncomingMessage & { id?: unknown }) => ({
        id: request.id,
        method: request.method,
        url: request.url,
      }),
      res: (response: ServerResponse) => ({ statusCode: response.statusCode }),
    },
  };
}
