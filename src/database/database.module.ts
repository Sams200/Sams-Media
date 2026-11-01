import { Global, Logger, Module, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongoClient } from 'mongodb';
import { Pool } from 'pg';
import { DbImpl, IUserProfileRepository, USER_PROFILE_REPOSITORY } from './user-profile.repository.js';
import { PostgresUserProfileRepository } from './postgres-user-profile.repository.js';
import { MongoUserProfileRepository } from './mongo-user-profile.repository.js';

const repositoryProvider: Provider = {
  provide: USER_PROFILE_REPOSITORY,
  inject: [ConfigService],
  useFactory: async (config: ConfigService): Promise<IUserProfileRepository> => {
    const logger = new Logger('DatabaseModule');

    // should use a factory here but lazy
    const impl = (config.get<string>('DB_IMPL') ?? 'postgres').toLowerCase() as DbImpl;

    let repo: IUserProfileRepository;
    switch (impl) {
      case 'postgres':
        repo = new PostgresUserProfileRepository(new Pool({
          connectionString: config.get<string>('PG_URI', 'postgres://sams:sams@127.0.0.1:5432/sams_media'),
          max: 10,
        }));
        break;
      case 'mongo': {
        const client = new MongoClient(config.get<string>('MONGO_URI', 'mongodb://127.0.0.1:27017'));
        await client.connect();
        repo = new MongoUserProfileRepository(client, config.get<string>('MONGO_DB', 'sams_media'));
        break;
      }
      default:
        throw new Error(`Unknown DB_IMPL="${impl}" — expected "postgres" or "mongo"`);
    }

    await repo.init();
    logger.log(`User profile repository: ${repo.impl}`);
    return repo;
  },
};

@Global()
@Module({ providers: [repositoryProvider], exports: [USER_PROFILE_REPOSITORY] })
export class DatabaseModule {}