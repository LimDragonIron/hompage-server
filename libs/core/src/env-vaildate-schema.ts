import { plainToInstance } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsString, validateSync } from 'class-validator';

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

  @IsString()
  @IsNotEmpty()
  REDIS_HOST: string;

  @IsString()
  @IsNotEmpty()
  REDIS_PORT: string;

  @IsString()
  @IsNotEmpty()
  REDIS_PASSWORD: string;
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
        .map((error) => Object.values(error.constraints))
        .join(', ')}`,
    );
  }

  return validatedConfig;
};
