import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
    }),
  );

  // Enable global interceptors
  app.useGlobalInterceptors(new ResponseInterceptor());

  // CORS only from stream.gift
  // In development, also allow localhost:3000
  app.enableCors({
    origin: [
      'https://stream.gift',
      'https://alpha.stream.gift',
      'https://www.stream.gift',
      ...(process.env.ENV === 'development' ? ['http://localhost:3000'] : []),
    ],
    credentials: true,
  });

  // Parse and set cookies
  app.use(cookieParser());

  const port = process.env.PORT || 3000;

  await app.listen(port);

  const logger = new Logger('NestApplication');
  logger.log(`Running on port ${port}`);
}
bootstrap();
