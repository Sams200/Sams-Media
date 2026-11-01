import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { performance } from 'node:perf_hooks';
import { USER_PROFILE_REPOSITORY } from '../database/user-profile.repository.js';
import type { IUserProfileRepository } from '../database/user-profile.repository.js';
import { INTERESTS } from '../seed/generator.js';


export interface QueryStat {
  query: string;
  ops: number;
  minMs: number; p50Ms: number; p95Ms: number; p99Ms: number; maxMs: number;
  avgMs: number; opsPerSec: number;
}

// https://github.com/cprosche/mulberry32
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

@Injectable()
export class BenchService {
  constructor(@Inject(USER_PROFILE_REPOSITORY) private readonly repo: IUserProfileRepository) {}

  async run(ops = 1000, warmup = 50, rngSeed = 1) {
    const total = await this.repo.count();
    if (total === 0) throw new BadRequestException('Database is empty — POST /admin/seed first');

    const sample = await this.repo.findPage(0, Math.min(1000, total));
    const rand = mulberry32(rngSeed);
    const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];

    const results: QueryStat[] = [];
    results.push(await this.measure('findById', ops, warmup,
      () => this.repo.findById(pick(sample).id)));
    results.push(await this.measure('findByUsername', ops, warmup,
      () => this.repo.findByUsername(pick(sample).username)));
    results.push(await this.measure('findByInterest', ops, warmup,
      () => this.repo.findByInterest(pick(sample).interests[0] ?? INTERESTS[0], 20)));
    results.push(await this.measure('findPage(randomDeepOffset)', ops, warmup,
      () => this.repo.findPage(Math.floor(rand() * Math.max(1, total - 20)), 20)));
    results.push(await this.measure('updateBio', ops, warmup,
      () => this.repo.updateBio(pick(sample).id, 'benchmark bio update')));

    return {
      impl: this.repo.impl,
      rowsInDb: total,
      opsPerQuery: ops,
      warmupOps: warmup,
      results,
    };
  }

  private async measure(query: string, ops: number, warmup: number, fn: () => Promise<unknown>): Promise<QueryStat> {
    for (let i = 0; i < warmup; i++) await fn(); // discarded warmup

    const samples: number[] = [];
    const t0 = performance.now();
    for (let i = 0; i < ops; i++) {
      const s = performance.now();
      await fn();
      samples.push(performance.now() - s);
    }
    const totalMs = performance.now() - t0;

    samples.sort((a, b) => a - b);
    const pct = (p: number) => samples[Math.min(samples.length - 1, Math.ceil((p / 100) * samples.length) - 1)];
    const r = (n: number) => Math.round(n * 1000) / 1000;

    return {
      query, ops,
      minMs: r(samples[0]),
      p50Ms: r(pct(50)),
      p95Ms: r(pct(95)),
      p99Ms: r(pct(99)),
      maxMs: r(samples[samples.length - 1]),
      avgMs: r(samples.reduce((a, b) => a + b, 0) / samples.length),
      opsPerSec: Math.round((ops / totalMs) * 1000),
    };
  }
}