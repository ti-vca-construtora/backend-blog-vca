import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

import { PrismaModule } from '../prisma/prisma.module';
import { GruposModule } from '../grupos/grupos.module';
import { ComunicacoesModule } from '../comunicacoes/comunicacoes.module';
import { BackupsModule } from '../backups/backups.module';
import { AuthModule } from '../auth/auth.module';
import { PostsModule } from '../posts/posts.module';
import { BannersModule } from 'src/banners/banners.module';
import { CategoriasModule } from 'src/categorias/categorias.module';
import { UsersModule } from '../users/users.module';
import { StoriesModule } from '../stories/stories.module';
import { EventosModule } from '../eventos/eventos.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // 🔥 AQUI ESTÁ A CORREÇÃO
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'files'),
      serveRoot: '/files',
    }),

    PrismaModule,
    AuthModule,
    GruposModule,
    ComunicacoesModule,
    BackupsModule,
    PostsModule,
    BannersModule,
    CategoriasModule,
    UsersModule,
    StoriesModule,
    EventosModule,
  ],
})
export class AppModule {}