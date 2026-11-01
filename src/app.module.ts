import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module.js';
import { ProfilesModule } from './profiles/profiles.module.js';
import { SeedModule } from './seed/seed.module.js';
import { BenchModule } from './bench/bench.module.js';
import { AdminModule } from './admin/admin.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    DatabaseModule,
    ProfilesModule,
    SeedModule,
    BenchModule,
    AdminModule,
  ],
})
export class AppModule {}