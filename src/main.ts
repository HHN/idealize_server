import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { setupSwagger } from "swagger/swagger.config";
import * as dotenv from "dotenv";
import { NestExpressApplication } from "@nestjs/platform-express";
import rateLimit from "express-rate-limit";
import * as bodyParser from "body-parser";

// import { join } from 'path';
// import * as express from 'express';
// import csurf from 'csurf';
// import cookieParser from 'cookie-parser';
// import mongoose from 'mongoose';

/**
 * Validate encryption environment variables
 * TODO SH: GDPR encryption - fail fast if keys missing or invalid length
 */
function validateEncryptionKeys(): void {
  const dekBase64 = process.env.ENCRYPTION_DEK_B64;
  const hmacKeyBase64 = process.env.ENCRYPTION_HMAC_KEY_B64;
  const keyVersion = process.env.ENCRYPTION_KEY_VERSION || 'v1';

  //TODO SH: GDPR encryption - check if keys are present
  if (!dekBase64 || !hmacKeyBase64) {
    console.error(
      '❌ ENCRYPTION KEYS NOT CONFIGURED\n' +
      'Required environment variables:\n' +
      '  - ENCRYPTION_DEK_B64 (32 bytes base64-encoded)\n' +
      '  - ENCRYPTION_HMAC_KEY_B64 (32 bytes base64-encoded)\n' +
      '  - ENCRYPTION_KEY_VERSION (optional, defaults to "v1")\n\n' +
      'Generate keys with: openssl rand -base64 32'
    );
    throw new Error('Missing required encryption keys');
  }

  //TODO SH: GDPR encryption - validate DEK is exactly 32 bytes
  const dekBuffer = Buffer.from(dekBase64, 'base64');
  if (dekBuffer.length !== 32) {
    console.error(
      `❌ ENCRYPTION_DEK_B64 must be 32 bytes, got ${dekBuffer.length} bytes\n` +
      'Generate with: openssl rand -base64 32'
    );
    throw new Error('Invalid DEK length');
  }

  //TODO SH: GDPR encryption - validate HMAC key is exactly 32 bytes
  const hmacKeyBuffer = Buffer.from(hmacKeyBase64, 'base64');
  if (hmacKeyBuffer.length !== 32) {
    console.error(
      `❌ ENCRYPTION_HMAC_KEY_B64 must be 32 bytes, got ${hmacKeyBuffer.length} bytes\n` +
      'Generate with: openssl rand -base64 32'
    );
    throw new Error('Invalid HMAC key length');
  }

  console.log(`✅ Encryption keys validated (version: ${keyVersion})`);
}

async function bootstrap() {
  /* Load environment variables based on NODE_ENV */
  if (process.env.NODE_ENV === "production") {
    dotenv.config({ path: "production.env" });
  } else {
    if (process.env.NODE_ENV === 'development') {

      dotenv.config({ path: 'config/env/development.env' });
    } else {
      dotenv.config({ path: 'config/env/staging.env' });
    }
  }

  //TODO SH: GDPR encryption - validate encryption keys on startup (fail fast)
  validateEncryptionKeys();

  /* Create NestJS application */
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  /* Set global prefix */
  // app.setGlobalPrefix('api');

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
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Content-Security-Policy", "default-src 'self'");
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
    next();
  });

  /* Enable rate limiting */
  // app.use(rateLimit({
  //   windowMs: 5 * 60000, // 5 minutes
  //   standardHeaders: true,
  //   max: 1000,
  // }));

  /* Enable CORS */
  app.enableCors({
    origin: [
      "http://localhost:4200",
      "http://localhost:8200",
      "http://localhost:8080",
      "http://flutter-web-app",
      "https://flutter-web-app",
      "http://admin-dev.campusconnects.de",
      "https://admin-dev.campusconnects.de",
      "https://landing.campusconnects.de",
    ],
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
  });

  /* Setup Swagger */
  setupSwagger(app);

  app.use(bodyParser.json({ limit: "10mb" }));
  app.use(bodyParser.urlencoded({ limit: "10mb", extended: true }));

  await app.listen(process.env.PORT || 6000);
}

bootstrap();
