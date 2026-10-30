import { Module } from '@nestjs/common';

import { DependencyChecks } from './dependency-checks.js';
import { HealthEndpoints } from './endpoints.js';
import { ConfigurableModuleClass } from './health-module-definition.js';

@Module({ controllers: [HealthEndpoints], providers: [DependencyChecks] })
export class HealthModule extends ConfigurableModuleClass {}
