import type { ConfigType } from '@nestjs/config';
import { registerAs } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsString, validateSync } from 'class-validator';

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
  cloudfrontDomain: process.env.CLOUDFRONT_DOMAIN ?? '',
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

// 환경변수 유효성 검사
enum Environment {
  Local = 'local',
  Development = 'dev',
  Production = 'prod',
}

class EnvValidateSchema {
  @IsEnum(Environment)
  NODE_ENV: Environment;

  @IsString()
  @IsNotEmpty()
  APP_PORT: string;

  // JWT
  @IsString()
  @IsNotEmpty()
  JWT_SECRET: string;

  @IsString()
  @IsNotEmpty()
  JWT_EXPIRES_IN: string;

  @IsString()
  @IsNotEmpty()
  REFRESH_TOKEN_SECRET: string;

  @IsString()
  @IsNotEmpty()
  REFRESH_TOKEN_EXPIRES_IN: string;

  // DB
  @IsString()
  @IsNotEmpty()
  DB_HOST: string;

  @IsString()
  @IsNotEmpty()
  DB_PORT: string;

  @IsString()
  @IsNotEmpty()
  DB_USER: string;

  @IsString()
  @IsNotEmpty()
  DB_PASSWORD: string;

  @IsString()
  @IsNotEmpty()
  DB_NAME: string;

  // S3
  @IsString()
  @IsNotEmpty()
  AWS_REGION: string;

  @IsString()
  @IsNotEmpty()
  AWS_S3_BUCKET: string;

  @IsString()
  @IsNotEmpty()
  AWS_ACCESS_KEY_ID: string;

  @IsString()
  @IsNotEmpty()
  AWS_SECRET_ACCESS_KEY: string;

  // CloudFront Domain (필수)
  @IsString()
  @IsNotEmpty()
  CLOUDFRONT_DOMAIN: string;
}

export const validate = (config: Record<string, unknown>) => {
  const validatedConfig = plainToInstance(EnvValidateSchema, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(
      `Config validation error: ${errors
        .map((error) => Object.values(error.constraints).join(', '))
        .join(', ')}`,
    );
  }

  return validatedConfig;
};
