import type { ConfigType } from '@nestjs/config';
import { registerAs } from '@nestjs/config';

// JWT Auth Config
export const authConfig = registerAs('jwt', () => {
  const jwtSecret = process.env.JWT_SECRET;
  const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET;
  if (!jwtSecret) throw new Error('JWT_SECRET is not set');
  if (!refreshTokenSecret) throw new Error('REFRESH_TOKEN_SECRET is not set');
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

// Logger Config
export const loggerConfig = registerAs('logger', () => ({
  level: process.env.LOG_LEVEL ?? 'error',
}));

// DB Config
export const databaseConfig = registerAs('database', () => ({
  url: generateDatabaseUrl(
    process.env.DB_HOST,
    +(process.env.DB_PORT ?? 3306),
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    process.env.DB_NAME,
  ),
}));

const generateDatabaseUrl = (
  host = 'localhost',
  port = 3306,
  user = 'root',
  password = '1234',
  database = 'test',
) => {
  return `mysql://${user}:${password}@${host}:${port}/${database}`;
};

// S3/CloudFront Storage Config
export const storageConfig = registerAs('storage', () => ({
  region: process.env.AWS_REGION ?? 'ap-northeast-2',
  bucket: process.env.AWS_S3_BUCKET ?? '',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
  cloudfrontDomain:
    process.env.CLOUDFRONT_DOMAIN ?? process.env.RESOURCE_DOMAIN ?? '',
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
