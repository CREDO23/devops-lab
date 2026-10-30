import { Controller, Get } from '@nestjs/common';

import { runningVersion } from './running-version.js';

@Controller()
export class VersionEndpoints {
  @Get('version')
  version(): { version: string } {
    return { version: runningVersion() };
  }
}
