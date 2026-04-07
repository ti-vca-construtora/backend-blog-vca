import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { GruposModule } from '../grupos/grupos.module';
import { ComunicacoesModule } from '../comunicacoes/comunicacoes.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    GruposModule,
    ComunicacoesModule,
  ],
})
export class AppModule {}
