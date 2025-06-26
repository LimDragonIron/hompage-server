import { ResponseBuilder } from '@app/response';
import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class RefreshAuthGuard extends AuthGuard('refresh') {
  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    if (info) {
      // 토큰 만료 오류 식별[4]
      if (info.message === 'refresh expired') {
        throw new UnauthorizedException(
          ResponseBuilder.Error('Token expired', 'REFRESH_EXPIRED_TOKEN'),
        );
      }
      // 유효하지 않은 토큰 오류
      if (info.message.includes('invalid token')) {
        throw new UnauthorizedException(
          ResponseBuilder.Error('Invalid token', 'REFRESH_UNAUTHORIZED_TOKEN'),
        );
      }
    }
    return super.handleRequest(err, user, info, context);
  }
}
