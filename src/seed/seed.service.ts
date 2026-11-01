import { Inject, Injectable, Logger } from '@nestjs/common';
import { USER_PROFILE_REPOSITORY } from '../database/user-profile.repository.js';
import type { IUserProfileRepository } from '../database/user-profile.repository.js';
import { generateUsers } from './generator.js';

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(@Inject(USER_PROFILE_REPOSITORY) private readonly repo: IUserProfileRepository) {}

  // profile insertion speed
  async seed(size: number, seed: number, chunkSize = 2000) {
    await this.repo.reset();
    const t0 = performance.now();
    let inserted = 0;
    for (const batch of generateUsers(size, chunkSize, seed)) {
      await this.repo.insertBatch(batch);
      inserted += batch.length;
      if (inserted % (chunkSize * 5) === 0) this.logger.log(`seeded ${inserted}/${size}`);
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