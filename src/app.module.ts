import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { NewsModule } from './news/news.module';
import { GamesModule } from './games/games.module';
import { PromotionsModule } from './promotions/promotions.module';
import { CoreModule } from '@app/core';
import { APP_FILTER } from '@nestjs/core';
import { GlobalExceptionFilter } from '@app/error';
import { UploadfileModule } from './uploadfile/uploadfile.module';
import { CompanyModule } from './company/company.module';
import { HeroModule } from './hero/hero.module';
import { ContactModule } from './contact/contact.module';

@Module({
  imports: [
    CoreModule,
    AuthModule,
    UserModule,
    NewsModule,
    GamesModule,
    PromotionsModule,
    UploadfileModule,
    CompanyModule,
    HeroModule,
    ContactModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
  ],
})
export class AppModule {}
