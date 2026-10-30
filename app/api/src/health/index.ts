/** Liveness and readiness checks, outside /api so the proxy never routes them. */
export type { HealthOptions } from './health-options.js';
export { HealthModule } from './health.module.js';
