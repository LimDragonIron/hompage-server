import { HttpException, HttpStatus } from '@nestjs/common';

export enum HttpErrorCode {
  // 400 Series
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_ID = 'INVALID_ID',
  UNIQUE_CONSTRAINT = 'UNIQUE_CONSTRAINT',
  ACCOUNT_NOT_FOUND = 'ACCOUNT_NOT_FOUND',

  // 401/403 Series
  UNAUTHORIZED = 'UNAUTHORIZED',
  UNAUTHORIZED_TOKEN = 'UNAUTHORIZED_TOKEN',
  EXPIRED_TOKEN = 'EXPIRED_TOKEN',
  REFRESH_EXPIRED_TOKEN = 'REFRESH_EXPIRED_TOKEN',
  REFRESH_UNAUTHORIZED_TOKEN = 'REFRESH_UNAUTHORIZED_TOKEN',
  RESTRICTED_RESOURCE = 'RESTRICTED_RESOURCE',
  FORBIDDEN = 'FORBIDDEN',

  // 404 Series
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',

  //409
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',

  // 500 Series
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
}

export const prismaErrorMapping: Record<
  string,
  { status: number; code: HttpErrorCode; message: string }
> = {
  P2000: {
    status: 400,
    code: HttpErrorCode.VALIDATION_ERROR,
    message: '입력값이 유효하지 않습니다.',
  },
  P2002: {
    status: 409,
    code: HttpErrorCode.UNIQUE_CONSTRAINT,
    message: '이미 존재하는 값입니다.',
  },
  P2025: {
    status: 404,
    code: HttpErrorCode.ACCOUNT_NOT_FOUND,
    message: '대상을 찾을 수 없습니다.',
  },
  // ...필요시 추가
};

export class CustomHttpException extends HttpException {
  code: HttpErrorCode;

  constructor(message: string, code: HttpErrorCode) {
    super(message, HttpStatus[code.split('_').join('')] || 500);
    this.code = code;
  }
}
