import type { ConfigType } from '@nestjs/config';
import { registerAs } from '@nestjs/config';

export const authConfig = registerAs('jwt', () => {
  const jwtSecret = process.env.JWT_SECRET;
  const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not set');
  }
  if (!refreshTokenSecret) {
    throw new Error('REFRESH_TOKEN_SECRET is not set');
  }
  return {
    accessToken: {
      secret: jwtSecret,
      expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    },
    refreshToken: {
      secret: refreshTokenSecret,
      expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
    },
  };
});

export const loggerConfig = registerAs('logger', () => ({
  level: process.env.LOG_LEVEL ?? 'error',
}));

export const databaseConfig = registerAs('database', () => ({
  url: gnerateDatabaseUrl(
    process.env.DB_HOST,
    +process.env.DB_PORT,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    process.env.DB_NAME,
  ),
}));

const gnerateDatabaseUrl = (
  host = 'localhost',
  port = 3306,
  user = 'root',
  password = '1234',
  database = 'test',
) => {
  return `mysql://${user}:${password}@${host}:${port}/${database}`;
};

export const storageConfig = registerAs('storage', () => ({
  root: process.env.STORAGE_DIRECTORY,
  accessKey: process.env.STORAGE_ACCESS_KEY ?? '',
  account: process.env.STORAGE_ACCOUNT_NAME ?? '',
  container: process.env.STORAGE_CONTAINER_NAME ?? '',
}));

export type StorageConfig = ConfigType<typeof storageConfig>;

export type AuthConfig = ConfigType<typeof authConfig>;
export type DatabaseConfig = ConfigType<typeof databaseConfig>;
export type LoggerConfig = ConfigType<typeof loggerConfig>;

export const configuration = [
  authConfig,
  databaseConfig,
  loggerConfig,
  storageConfig,
];
