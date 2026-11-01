import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { USER_PROFILE_REPOSITORY } from '../database/user-profile.repository.js';
import type { IUserProfileRepository } from '../database/user-profile.repository.js';
import { CreateUserProfileDto } from './dto/create-user-profile.dto.js';

@Injectable()
export class ProfilesService {
  constructor(@Inject(USER_PROFILE_REPOSITORY) private readonly repo: IUserProfileRepository) {}

  byId(id: string) { return this.repo.findById(id); }
  byUsername(username: string) { return this.repo.findByUsername(username); }
  byInterest(interest: string, limit: number) { return this.repo.findByInterest(interest, limit); }
  page(offset: number, limit: number, afterId?: string) { return this.repo.findPage(offset, limit, afterId); }

  async create(dto: CreateUserProfileDto) {
    try {
      return await this.repo.create(dto);
    } catch (err: any) {
      // pg unique violation | mongo duplicate key
      if (err?.code === '23505' || err?.code === 11000) {
        throw new ConflictException('username or email already exists');
      }
      throw err;
    }
  }

  updateBio(id: string, bio: string) { return this.repo.updateBio(id, bio); }
}