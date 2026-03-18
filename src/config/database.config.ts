import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import * as dotenv from 'dotenv';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

dotenv.config();

const databaseConfig = (): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'postgres',

  entities: [__dirname + '/../modules/**/entities/*.entity.{ts,js}'],

  migrations: [__dirname + '/../../migrations/*.{ts,js}'],

  synchronize: false,

  logging: process.env.TYPEORM_LOGGING === 'true',
  namingStrategy: new SnakeNamingStrategy(),

  extra: {
    max: parseInt(process.env.DB_POOL_MAX || '20', 10),
    min: parseInt(process.env.DB_POOL_MIN || '5', 10),
    idleTimeoutMillis: 30000,
  },
});

export default databaseConfig;
