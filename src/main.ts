import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ResponseInterceptor } from './shared/interceptors/response.interceptor';
import * as bodyParser from 'body-parser';
import type { Request, Response, NextFunction } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Set global prefix
  app.setGlobalPrefix('api/vimas');

  // Stripe webhook needs the raw, untouched request body to verify the
  // signature — it must never be parsed by the JSON body parser below.
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.originalUrl === '/api/vimas/orders/webhook') {
      bodyParser.raw({ type: 'application/json' })(req, res, next);
    } else {
      bodyParser.json()(req, res, next);
    }
  });
  
  app.use(bodyParser.urlencoded({ extended: true }));

  app.enableCors({
    origin: [
      'http://localhost:5173',
      'http://localhost:5174',
      'https://app.tradelive24.com',
      'https://tradelive24.com',
      'https://www.tradelive24.com',
      'https://vimasgv.com',
      'https://www.vimasgv.com',
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalInterceptors(new ResponseInterceptor());
  await app.listen(process.env.PORT ?? 5002);
  console.log(`✅ Backend running on port ${process.env.PORT}`);
}
bootstrap();
