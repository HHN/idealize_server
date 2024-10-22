import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';
import basicAuth from 'express-basic-auth';
import { ConfigService } from '@nestjs/config';

export function setupSwagger(app: INestApplication) {

    const configService = app.get(ConfigService);
    
    const swaggerUsername = configService.get<string>('SWAGGER_USERNAME');
    const swaggerPassword = configService.get<string>('SWAGGER_PASSWORD');

    app.use(
        ['/docs', '/docs-json'],
        basicAuth({
          challenge: true,
          users: {
            [swaggerUsername]: swaggerPassword,
          },
        }),
      );

    const options = new DocumentBuilder()
        .setTitle('Idealize Backend Swagger')
        .setDescription('All the endpoints are listed below :')
        .setVersion('1.0')
        .addBearerAuth({
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            name: 'JWT',
            description: 'Enter JWT token',
            in: 'header',
        }, 'JWT-auth')
        .build();

    const document = SwaggerModule.createDocument(app, options);
    SwaggerModule.setup('docs', app, document, {
        
        swaggerOptions: {
            multipartFormOptions: {
                include: true, // Include multipart/form-data fields in Swagger UI
            },
        },
    });
}
