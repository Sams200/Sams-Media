import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller.js';
import { SeedModule } from '../seed/seed.module.js';
import { BenchModule } from '../bench/bench.module.js';

@Module({
  imports: [SeedModule, BenchModule],
  controllers: [AdminController],
})
export class AdminModule {}