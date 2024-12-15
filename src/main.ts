import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setupSwagger } from 'swagger/swagger.config';
import * as dotenv from 'dotenv';
import { NestExpressApplication } from '@nestjs/platform-express';
import rateLimit from 'express-rate-limit';

// import { join } from 'path';
// import * as express from 'express';
// import csurf from 'csurf';
// import cookieParser from 'cookie-parser';
// import mongoose from 'mongoose';


async function bootstrap() {
  /* Load environment variables based on NODE_ENV */
  if (process.env.NODE_ENV === 'production') {
    dotenv.config({ path: 'production.env' });
  } else {
    dotenv.config({ path: 'development.env' });
  }

  /* Create NestJS application */
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  /* Set global prefix */
  app.setGlobalPrefix('api');

  /* Serve static files */
  // const uploadsPath = join(__dirname, '..', '..', 'uploads');
  // app.use('/resources', express.static(uploadsPath));

  /* Enable Mongoose debugging */
  // mongoose.set('debug', true);


  /* Enable CSRF */
  // app.use(cookieParser());
  // app.use(csurf({ cookie: { sameSite: true } }));
  app.use((req: any, res: any, next: any) => {
    // const token = req.csrfToken();
    // res.cookie('XSRF-TOKEN', token);
    // res.locals.csrfToken = token;
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Content-Security-Policy', "default-src 'self'");
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    next();
  });


  /* Enable rate limiting */
  app.use(rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 300,
  }));


  /* Enable CORS */
  app.enableCors({
    origin: [
      'http://localhost:4200',
      'http://localhost:8080',
      'http://flutter-web-app',
      'https://flutter-web-app',
      'http://admin.campusconnects.de',
      'https://admin.campusconnects.de'
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  /* Setup Swagger */
  setupSwagger(app);

  await app.listen(process.env.PORT || 3000);
}

bootstrap();