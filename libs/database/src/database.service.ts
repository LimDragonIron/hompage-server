import { ConfigService } from '@nestjs/config';
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { DatabaseConfig } from '@app/core';

@Injectable()
export class DatabaseService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(DatabaseService.name);

  constructor(private readonly configService: ConfigService) {
    const databaseUrl =
      configService.getOrThrow<DatabaseConfig>('database').url;
    super({
      log: ['query', 'info', 'warn', 'error'],
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
    });
    const maskedUrl = databaseUrl.replace(/:\/\/[^@]+@/, '://***:***@');

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
