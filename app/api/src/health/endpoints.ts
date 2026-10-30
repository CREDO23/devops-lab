import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';

import { DependencyChecks } from './dependency-checks.js';

type Readiness = { status: 'ready' } | { status: 'not ready'; failing: string[] };

@Controller()
export class HealthEndpoints {
  constructor(private readonly checks: DependencyChecks) {}

  @Get('livez')
  liveness(): { status: string } {
    // Never checks dependencies: a database outage must not get the API restarted.
    return { status: 'alive' };
  }

  @Get('readyz')
  async readiness(@Res({ passthrough: true }) response: Response): Promise<Readiness> {
    const failing = await this.checks.failingDependencies();
    if (failing.length > 0) {
      response.status(503);
      return { status: 'not ready', failing };
    }
    return { status: 'ready' };
  }
}
