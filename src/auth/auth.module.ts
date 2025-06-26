import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserModule } from 'src/user/user.module';
import { PassportModule } from '@nestjs/passport';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthConfig } from '@app/core';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RefreshStrategy } from './strategies/refresh.strategy';

@Module({
  imports: [
    UserModule,
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        global: true,
        secret: configService.getOrThrow<AuthConfig>('jwt').accessToken.secret,
        signOptions: {
          expiresIn:
            configService.getOrThrow<AuthConfig>('jwt').accessToken.expiresIn,
        },
        refreshSecret:
          configService.getOrThrow<AuthConfig>('jwt').refreshToken.secret,
        refreshExpiresIn:
          configService.getOrThrow<AuthConfig>('jwt').refreshToken.expiresIn,
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, LocalStrategy, JwtStrategy, RefreshStrategy],
})
export class AuthModule {}
