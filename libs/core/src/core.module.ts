import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { configuration } from './env-config';
import { LoggerModule } from './logger.module';
import { validate } from './env-vaildate-schema';
import { ClsMiddleware, ClsModule } from 'nestjs-cls';
import { DatabaseModule } from '@app/database';

const clsModule = ClsModule.forRoot({
  global: true,
  middleware: {
    generateId: true,
  },
});

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: configuration,
      validate,
      expandVariables: true,
    }),
    clsModule,
    LoggerModule.register(),
    DatabaseModule.forRoot(),
  ],
})
export class CoreModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ClsMiddleware).forRoutes('*');
  }
}
