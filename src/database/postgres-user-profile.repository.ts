import { OnModuleDestroy } from '@nestjs/common';
import { Pool, PoolClient, QueryResultRow } from 'pg';
import { DbImpl, IUserProfileRepository } from './user-profile.repository.js';
import { CreateUserProfileDto } from '../profiles/dto/create-user-profile.dto.js';
import { newUserProfile, UserProfile } from '../profiles/entities/user-profile.js';

const DDL = `
CREATE TABLE IF NOT EXISTS users (
  id                  uuid PRIMARY KEY,
  username            text NOT NULL UNIQUE,
  email               text NOT NULL UNIQUE,
  full_name           text NOT NULL,
  bio                 text NOT NULL DEFAULT '',
  birth_date          date,
  gender              text,
  city                text,
  country             text,
  lat                 double precision,
  lon                 double precision,
  profile_picture_url text,
  is_private          boolean NOT NULL DEFAULT false,
  created_at          timestamptz NOT NULL,
  updated_at          timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS user_interests (
  user_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  interest text NOT NULL,
  PRIMARY KEY (user_id, interest)
);
CREATE INDEX IF NOT EXISTS idx_user_interests_interest ON user_interests (interest);
CREATE TABLE IF NOT EXISTS user_social_links (
  user_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform text NOT NULL,
  url      text NOT NULL,
  PRIMARY KEY (user_id, platform)
);
CREATE INDEX IF NOT EXISTS idx_users_created_at_id ON users (created_at DESC, id ASC);
`;

const PROFILE_COLUMNS = `
  u.id, u.username, u.email, u.full_name AS "fullName", u.bio,
  u.birth_date AS "birthDate", u.gender, u.city, u.country,
  u.lat, u.lon,
  u.profile_picture_url AS "profilePictureUrl",
  u.is_private AS "isPrivate",
  u.created_at AS "createdAt", u.updated_at AS "updatedAt",
  COALESCE(i.interests, '[]'::json) AS interests,
  COALESCE(l.links, '[]'::json) AS "socialLinks"
`;

const PROFILE_JOINS = `
  LEFT JOIN LATERAL (
    SELECT json_agg(ui.interest ORDER BY ui.interest) AS interests
    FROM user_interests ui WHERE ui.user_id = u.id
  ) i ON true
  LEFT JOIN LATERAL (
    SELECT json_agg(json_build_object('platform', sl.platform, 'url', sl.url)) AS links
    FROM user_social_links sl WHERE sl.user_id = u.id
  ) l ON true
`;

export class PostgresUserProfileRepository implements IUserProfileRepository, OnModuleDestroy {
  readonly impl: DbImpl = 'postgres';

  constructor(private readonly pool: Pool) {}

  async init(): Promise<void> {
    await this.pool.query(DDL);
  }

  async reset(): Promise<void> {
    await this.pool.query('TRUNCATE users CASCADE');
  }

  async count(): Promise<number> {
    const { rows } = await this.pool.query('SELECT COUNT(*)::int AS n FROM users');
    return rows[0].n;
  }

  async insertBatch(batch: UserProfile[]): Promise<void> {
    if (batch.length === 0) return;
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await this.insertUsers(client, batch);
      await this.insertInterests(client, batch);
      await this.insertLinks(client, batch);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async findById(id: string): Promise<UserProfile | null> {
    const { rows } = await this.pool.query(
      `SELECT ${PROFILE_COLUMNS} FROM users u ${PROFILE_JOINS} WHERE u.id = $1`, [id]);
    return rows[0] ? this.toDomain(rows[0]) : null;
  }

  async findByUsername(username: string): Promise<UserProfile | null> {
    const { rows } = await this.pool.query(
      `SELECT ${PROFILE_COLUMNS} FROM users u ${PROFILE_JOINS} WHERE u.username = $1`, [username]);
    return rows[0] ? this.toDomain(rows[0]) : null;
  }

  async findByInterest(interest: string, limit: number): Promise<UserProfile[]> {
    const { rows } = await this.pool.query(
      `SELECT ${PROFILE_COLUMNS}
       FROM users u
       JOIN user_interests filt ON filt.user_id = u.id AND filt.interest = $1
       ${PROFILE_JOINS}
       ORDER BY u.id
       LIMIT $2`, [interest, limit]);
    return rows.map((r) => this.toDomain(r));
  }

  async findPage(offset: number, limit: number, afterId?: string): Promise<UserProfile[]> {
    let rows: QueryResultRow[];
    if (afterId) {
      ({ rows } = await this.pool.query(
        `WITH anchor AS (SELECT created_at, id FROM users WHERE id = $1)
         SELECT ${PROFILE_COLUMNS}
         FROM users u ${PROFILE_JOINS}
         CROSS JOIN anchor
         WHERE u.created_at < anchor.created_at
            OR (u.created_at = anchor.created_at AND u.id > anchor.id)
         ORDER BY u.created_at DESC, u.id ASC
         LIMIT $2`,
        [afterId, limit],
      ));
    } else {
      ({ rows } = await this.pool.query(
        `SELECT ${PROFILE_COLUMNS} FROM users u ${PROFILE_JOINS}
         ORDER BY u.created_at DESC, u.id ASC
         OFFSET $1 LIMIT $2`,
        [offset, limit],
      ));
    }
    return rows.map((r) => this.toDomain(r));
  }

  async create(dto: CreateUserProfileDto): Promise<UserProfile> {
    const profile = newUserProfile(dto);
    await this.insertBatch([profile]);
    return profile;
  }

  async updateBio(id: string, bio: string): Promise<boolean> {
    const res = await this.pool.query(
      'UPDATE users SET bio = $2, updated_at = now() WHERE id = $1', [id, bio]);
    return (res.rowCount ?? 0) > 0;
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }

  

  private async insertUsers(client: PoolClient, batch: UserProfile[]): Promise<void> {
    const params = batch.flatMap((u) => [
      u.id, u.username, u.email, u.fullName, u.bio,
      u.birthDate || null, u.gender, u.city, u.country,
      u.location.lat, u.location.lon, u.profilePictureUrl,
      u.isPrivate, u.createdAt, u.updatedAt,
    ]);
    await client.query(
      `INSERT INTO users (id, username, email, full_name, bio, birth_date, gender,
                          city, country, lat, lon, profile_picture_url,
                          is_private, created_at, updated_at)
       VALUES ${this.buildValues(batch.length, 15)}`,
      params,
    );
  }

  private async insertInterests(client: PoolClient, batch: UserProfile[]): Promise<void> {
    const rows: string[][] = batch.flatMap((u) => u.interests.map((i) => [u.id, i]));
    if (!rows.length) return;
    await client.query(
      `INSERT INTO user_interests (user_id, interest)
       VALUES ${this.buildValues(rows.length, 2)} ON CONFLICT DO NOTHING`,
      rows.flat(),
    );
  }

  private async insertLinks(client: PoolClient, batch: UserProfile[]): Promise<void> {
    const rows: string[][] = batch.flatMap((u) => u.socialLinks.map((s) => [u.id, s.platform, s.url]));
    if (!rows.length) return;
    await client.query(
      `INSERT INTO user_social_links (user_id, platform, url)
       VALUES ${this.buildValues(rows.length, 3)} ON CONFLICT DO NOTHING`,
      rows.flat(),
    );
  }

  private buildValues(rowCount: number, colCount: number): string {
    const rows: string[] = [];
    for (let r = 0; r < rowCount; r++) {
      const cols: string[] = [];
      for (let c = 0; c < colCount; c++) cols.push(`$${r * colCount + c + 1}`);
      rows.push(`(${cols.join(',')})`);
    }
    return rows.join(',');
  }

  private toDomain(row: QueryResultRow): UserProfile {
    const iso = (v: unknown) =>
      v instanceof Date ? v.toISOString() : new Date(v as string).toISOString();
    return {
      id: row.id,
      username: row.username,
      email: row.email,
      fullName: row.fullName,
      bio: row.bio,
      birthDate: row.birthDate
        ? (row.birthDate instanceof Date ? row.birthDate.toISOString().slice(0, 10) : String(row.birthDate))
        : '',
      gender: row.gender ?? '',
      city: row.city ?? '',
      country: row.country ?? '',
      location: { lat: row.lat ?? 0, lon: row.lon ?? 0 },
      interests: row.interests ?? [],
      socialLinks: row.socialLinks ?? [],
      profilePictureUrl: row.profilePictureUrl ?? '',
      isPrivate: row.isPrivate,
      createdAt: iso(row.createdAt),
      updatedAt: iso(row.updatedAt),
    };
  }
}