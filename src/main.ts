import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { ValidationPipe } from '@nestjs/common';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,//remover propriedades não declaradas nos DTOs
    transform: false, //transforma os tipos primitivos conforme declarado nos DTOs   
  }));

  // 🔹 Swagger Config
  const config = new DocumentBuilder()
    .setTitle('Blog VCA API')
    .setDescription('Documentação da API do Blog VCA')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        in: 'header',
      },
      'access-token',
    )
    .build()

  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('docs', app, document)

  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads',
  })

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();