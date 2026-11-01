import { Module } from '@nestjs/common';
import { BenchService } from './bench.service.js';

@Module({ providers: [BenchService], exports: [BenchService] })
export class BenchModule {}