import { Controller, DefaultValuePipe, Get, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { SeedService } from '../seed/seed.service.js';
import { BenchService } from '../bench/bench.service.js';

@ApiTags('admin')
@Controller('admin')
export class AdminController {
  constructor(
    private readonly seedService: SeedService,
    private readonly benchService: BenchService,
  ) {}

  @Post('seed')
  @ApiOperation({ summary: 'Reset and populate with deterministic random users' })
  @ApiQuery({ name: 'size', required: false, example: 10000 })
  @ApiQuery({ name: 'seed', required: false, example: 42 })
  seed(
    @Query('size', new DefaultValuePipe(10000), ParseIntPipe) size: number,
    @Query('seed', new DefaultValuePipe(42), ParseIntPipe) seed: number,
  ) {
    return this.seedService.seed(size, seed);
  }

  @Get('count')
  async count() {
    return { count: await this.seedService.count() };
  }

  @Post('bench')
  @ApiOperation({ summary: 'Run the measured query workload against the active repo' })
  @ApiQuery({ name: 'ops', required: false, example: 1000 })
  @ApiQuery({ name: 'warmup', required: false, example: 50 })
  bench(
    @Query('ops', new DefaultValuePipe(1000), ParseIntPipe) ops: number,
    @Query('warmup', new DefaultValuePipe(50), ParseIntPipe) warmup: number,
  ) {
    return this.benchService.run(ops, warmup);
  }
}