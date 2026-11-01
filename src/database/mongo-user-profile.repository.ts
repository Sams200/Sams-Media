import { OnModuleDestroy } from '@nestjs/common';
import { Collection, MongoClient } from 'mongodb';
import { DbImpl, IUserProfileRepository } from './user-profile.repository.js';
import { CreateUserProfileDto } from '../profiles/dto/create-user-profile.dto.js';
import { newUserProfile, UserProfile } from '../profiles/entities/user-profile.js';

type UserDoc = Omit<UserProfile, 'id'> & { _id: string };

export class MongoUserProfileRepository implements IUserProfileRepository, OnModuleDestroy {
  readonly impl: DbImpl = 'mongo';
  private readonly col: Collection<UserDoc>;

  constructor(private readonly client: MongoClient, dbName: string) {
    this.col = client.db(dbName).collection<UserDoc>('user_profiles');
  }

  async init(): Promise<void> {
    await Promise.all([
      this.col.createIndex({ username: 1 }, { unique: true }),
      this.col.createIndex({ email: 1 }, { unique: true }),
      this.col.createIndex({ interests: 1 }),
      this.col.createIndex({ createdAt: -1 }),
    ]);
  }

  async reset(): Promise<void> {
    await this.col.deleteMany({});
  }

  async count(): Promise<number> {
    return this.col.countDocuments({});
  }

  async insertBatch(batch: UserProfile[]): Promise<void> {
    if (!batch.length) return;
    await this.col.insertMany(batch.map((u) => this.toDoc(u)), { ordered: false });
  }

  async findById(id: string): Promise<UserProfile | null> {
    const doc = await this.col.findOne({ _id: id });
    return doc ? this.toDomain(doc) : null;
  }

  async findByUsername(username: string): Promise<UserProfile | null> {
    const doc = await this.col.findOne({ username });
    return doc ? this.toDomain(doc) : null;
  }

  async findByInterest(interest: string, limit: number): Promise<UserProfile[]> {
    const docs = await this.col.find({ interests: interest }).limit(limit).toArray();
    return docs.map((d) => this.toDomain(d));
  }

  async findPage(offset: number, limit: number): Promise<UserProfile[]> {
    const docs = await this.col
      .find()
      .sort({ createdAt: -1, _id: 1 })
      .skip(offset)
      .limit(limit)
      .toArray();
    return docs.map((d) => this.toDomain(d));
  }

  async create(dto: CreateUserProfileDto): Promise<UserProfile> {
    const profile = newUserProfile(dto);
    await this.insertBatch([profile]);
    return profile;
  }

  async updateBio(id: string, bio: string): Promise<boolean> {
    const res = await this.col.updateOne(
      { _id: id },
      { $set: { bio, updatedAt: new Date().toISOString() } },
    );
    return res.matchedCount > 0;
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.close();
  }

  private toDoc(u: UserProfile): UserDoc {
    const { id, ...rest } = u;
    return { _id: id, ...rest };
  }

  private toDomain(doc: UserDoc): UserProfile {
    const { _id, ...rest } = doc;
    return { id: _id, ...rest };
  }
}