<<<<<<< HEAD
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { GruposModule } from '../grupos/grupos.module';
import { ComunicacoesModule } from '../comunicacoes/comunicacoes.module';
=======
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from 'src/users/users.module';
import { CategoriasModule } from 'src/categorias/categorias.module';
import { AuthModule } from 'src/auth/auth.module';
import { BannersModule } from 'src/banners/banners.module';

import {LoggerMiddleware} from 'src/common/middleware/logger.middleware';

import { ConfigModule } from '@nestjs/config';
import jwtConfig from 'src/auth/config/jwt.config';
import {ServeStaticModule} from '@nestjs/serve-static';
import {join} from 'node:path';
import { PostsModule } from 'src/posts/posts.module';
import { EventosModule } from 'src/eventos/eventos.module';
import { StoriesModule } from 'src/stories/stories.module';
>>>>>>> c6ded7540776d2011921a19c4d062448741fb538

@Module({
  imports: [
    ConfigModule.forRoot({
<<<<<<< HEAD
      isGlobal: true,
    }),
    PrismaModule,
    GruposModule,
    ComunicacoesModule,
  ],
})
export class AppModule {}
=======
      isGlobal:true,
      load:[jwtConfig],
    }),        
    UsersModule, 
    CategoriasModule,
    BannersModule,  
    AuthModule,
    PostsModule,
    EventosModule,
    StoriesModule,
    ServeStaticModule.forRoot({
     rootPath: join(__dirname, '..', '..', 'files'),
     serveRoot: '/files',
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})

export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*')
  }
}
>>>>>>> c6ded7540776d2011921a19c4d062448741fb538
