import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { ResponseBuilder } from '@app/response';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({ usernameField: 'email' });
  }

  async validate(email: string, password: string): Promise<any> {
    const where = {
      email: email,
    };
    const user = await this.authService.validateUser(where, password);
    if (!user) {
      throw new UnauthorizedException(
        ResponseBuilder.Error('Invalid credentials', 'UNAUTHORIZED'),
      );
    }
    return user;
  }
}
