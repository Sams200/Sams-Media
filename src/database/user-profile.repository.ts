import type { UserProfile } from '../profiles/entities/user-profile.js';
import type { CreateUserProfileDto } from '../profiles/dto/create-user-profile.dto.js';

export const USER_PROFILE_REPOSITORY = Symbol('USER_PROFILE_REPOSITORY');

export type DbImpl = 'postgres' | 'mongo';

export interface IUserProfileRepository {
  readonly impl: DbImpl;

  // create schema / collections / indexes
  init(): Promise<void>;
  // delete all data, keep structure */
  reset(): Promise<void>;
  // bulk insert
  insertBatch(batch: UserProfile[]): Promise<void>;
  count(): Promise<number>;

  findById(id: string): Promise<UserProfile | null>;
  findByUsername(username: string): Promise<UserProfile | null>;
  findByInterest(interest: string, limit: number): Promise<UserProfile[]>;
  findPage(offset: number, limit: number): Promise<UserProfile[]>;
  create(dto: CreateUserProfileDto): Promise<UserProfile>;
  updateBio(id: string, bio: string): Promise<boolean>;
}