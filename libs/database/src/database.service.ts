import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import type { DatabaseConfig } from '@app/core';

@Injectable()
export class DatabaseService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(DatabaseService.name);

  constructor(private readonly configService: ConfigService) {
    const dbConfig = configService.getOrThrow<DatabaseConfig>('database');
    super({
      log: ['query', 'info', 'warn', 'error'],
      datasources: {
        db: {
          url: dbConfig.url,
        },
      },
    });
    const maskedUrl = dbConfig.url.replace(/:\/\/[^@]+@/, '://***:***@');
    this.logger.log('DatabaseService initialized');
    this.logger.log(`Database URL: ${maskedUrl}`);

    this.$on('query' as never, (event: { query: string; params: any }) => {
      this.logger.log(`Query: ${event.query}`);
      this.logger.log(`Params: ${JSON.stringify(event.params)}`);
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
