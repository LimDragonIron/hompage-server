import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { HttpErrorCode, prismaErrorMapping } from '@app/error';
import { ResponseBuilder } from '@app/response';
import { sanitizeError } from '@app/error';
import { Prisma } from '@prisma/client';
import { instanceToPlain } from 'class-transformer';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private logger = new Logger(GlobalExceptionFilter.name);
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();

    const processedError = this.processException(exception);
    const sanitizedError = sanitizeError(processedError);

    this.logError(processedError, exception);

    httpAdapter.reply(
      ctx.getResponse(),
      instanceToPlain(
        ResponseBuilder.Error(
          sanitizedError.message,
          sanitizedError.code,
          sanitizedError.meta,
        ),
      ),
      sanitizedError.statusCode,
    );
  }

  private processException(exception: unknown) {
    // Prisma 오류 처리 (KnownRequestError)
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const mapping = prismaErrorMapping[exception.code] || {
        status: 500,
        code: HttpErrorCode.DATABASE_ERROR,
        message: '데이터베이스 오류가 발생했습니다.',
      };
      const isProduction = process.env.NODE_ENV === 'production';
      return {
        ...mapping,
        // 운영환경에서는 안전한 메시지만, 개발환경에서는 원본 메시지도 meta에 포함
        message: mapping.message,
        meta: isProduction
          ? undefined
          : { ...exception.meta, originalMessage: exception.message },
        statusCode: mapping.status,
      };
    }

    // NestJS 기본 오류
    if (exception instanceof HttpException) {
      if (exception.getResponse()) {
        const ex = exception.getResponse();
        return {
          statusCode: exception.getStatus(),
          code: ex['_code'] || HttpErrorCode.INTERNAL_SERVER_ERROR,
          message:
            typeof ex['message'] === 'string'
              ? ex['message']
              : Array.isArray(ex['message'])
                ? ex['message'].join(', ')
                : '에러가 발생했습니다.',
          meta: ex['_meta'],
        };
      }

      return {
        statusCode: exception.getStatus(),
        code: exception['code'] || HttpErrorCode.INTERNAL_SERVER_ERROR,
        message: exception.message,
        meta: exception['response']?.meta,
      };
    }

    // 알 수 없는 오류
    return {
      statusCode: 500,
      code: HttpErrorCode.INTERNAL_SERVER_ERROR,
      message:
        process.env.NODE_ENV === 'production'
          ? 'Internal server error'
          : exception instanceof Error
            ? exception.message
            : 'Internal server error',
      meta:
        process.env.NODE_ENV === 'production'
          ? undefined
          : { originalError: exception },
    };
  }

  private logError(processedError: any, originalException: unknown) {
    const { statusCode, code, message, meta } = processedError;
    const logMessage = `[${code}] ${message}`;
    const context = { statusCode, meta };

    // 500대 에러는 stack trace 포함
    if (statusCode >= 500) {
      if (originalException instanceof Error) {
        context['stack'] = originalException.stack;
      }
      this.logger.error(logMessage, context);
    } else {
      this.logger.warn(logMessage, context);
    }
  }
}
