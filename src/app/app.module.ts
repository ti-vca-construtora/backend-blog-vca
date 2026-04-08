import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { GruposModule } from '../grupos/grupos.module';
import { ComunicacoesModule } from '../comunicacoes/comunicacoes.module';
import { BackupsModule } from '../backups/backups.module';
import { AuthModule } from '../auth/auth.module';
import { PostsModule } from '../posts/posts.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    GruposModule,
    ComunicacoesModule,
    BackupsModule,
    PostsModule,
  ],
})
export class AppModule {}
