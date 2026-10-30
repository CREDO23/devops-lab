import { Module } from '@nestjs/common';

import { VersionEndpoints } from './endpoints.js';

@Module({ controllers: [VersionEndpoints] })
export class VersionModule {}
