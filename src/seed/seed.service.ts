import { Inject, Injectable } from '@nestjs/common';
import { USER_PROFILE_REPOSITORY } from '../database/user-profile.repository.js';
import type { IUserProfileRepository } from '../database/user-profile.repository.js';
import { generateUsers } from './generator.js';

@Injectable()
export class SeedService {
  constructor(@Inject(USER_PROFILE_REPOSITORY) private readonly repo: IUserProfileRepository) {}

  // profile insertion seed
  async seed(size: number, seed: number, chunkSize = 2000) {
    await this.repo.reset();
    const t0 = performance.now();
    let inserted = 0;
    for (const batch of generateUsers(size, chunkSize, seed)) {
      await this.repo.insertBatch(batch);
      inserted += batch.length;
    }
    return {
      impl: this.repo.impl,
      requested: size,
      inserted,
      durationMs: Math.round(performance.now() - t0),
    };
  }

  count() {
    return this.repo.count();
  }
}