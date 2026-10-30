import { ConfigurableModuleBuilder } from '@nestjs/common';

import type { HealthOptions } from './health-options.js';

export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN: HEALTH_OPTIONS } =
  new ConfigurableModuleBuilder<HealthOptions>().build();
