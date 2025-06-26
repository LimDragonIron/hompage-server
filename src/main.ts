import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import * as cookieParser from 'cookie-parser';
import {
  ClassSerializerInterceptor,
  ValidationPipe,
  INestApplication,
} from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Reflector } from '@nestjs/core';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  const origins = getOrigins();

  app.enableCors({
    origin: origins,
    credentials: true,
  });

  app.use(cookieParser());

  // === CSP img-src에 백엔드 도메인/포트 추가 ===
  // .env의 FRONTEND_ORIGIN(예: http://localhost:3000)과 백엔드 도메인/포트를 사용해 imgSrc에 추가
  const backendOrigin =
    process.env.BACKEND_ORIGIN ||
    `http://localhost:${process.env.APP_PORT || 8080}`;
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          baseUri: ["'self'"],
          fontSrc: ["'self'", 'https:', 'data:'],
          formAction: ["'self'"],
          frameAncestors: ["'self'"],
          imgSrc: ["'self'", 'data:', backendOrigin], // 백엔드 이미지 주소 명시적으로 포함
          objectSrc: ["'none'"],
          scriptSrc: ["'self'"],
          scriptSrcAttr: ["'none'"],
          styleSrc: ["'self'", 'https:', "'unsafe-inline'"],
          upgradeInsecureRequests: [],
        },
      },
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      whitelist: true,
    }),
  );

  const logger = app.get(Logger);
  app.useLogger(logger);
  app.flushLogs();

  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // production이 아닐 때만 static 파일 서비스 적용
  if (process.env.NODE_ENV !== 'production') {
    app.useStaticAssets(join(__dirname, '..', 'uploads'), {
      prefix: '/uploads',
    });
  }

  setSwagger(app);

  const PORT = process.env.APP_PORT || 8080;

  await app.listen(PORT);

  logger.log(`> NODE_ENV is ${process.env.NODE_ENV}`);
  logger.log(`> Ready on PORT: ${PORT}`);
  logger.log(
    `> System Time Zone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`,
  );
  logger.log(`> Current System Time: ${new Date().toString()}`);

  process.on(
    'unhandledRejection',
    (reason: string, promise: Promise<unknown>) => {
      logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
      throw reason;
    },
  );

  process.on('uncaughtException', (error) => {
    logger.error(error);
  });
}

function getOrigins() {
  const origins = process.env.ORIGINS || '';
  return origins.split(',');
}

function setSwagger(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('API Backend')
    .setDescription('API Backend Api Description')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('docs', app, document);
}

bootstrap();
