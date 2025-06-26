import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthConfig } from '@app/core';
import { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => request?.cookies?.accessToken,
      ]),
      ignoreExpiration: false,
      secretOrKey:
        configService.getOrThrow<AuthConfig>('jwt').accessToken.secret,
    });
  }

  async validate(payload: any) {
    return {
      userId: payload.sub,
      userName: payload.name,
      uesrRole: payload.role,
      userEmail: payload.email,
    };
  }
}
