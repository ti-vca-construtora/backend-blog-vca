import { Module } from '@nestjs/common';
import { ComunicacoesController } from './comunicacoes.controller';
import { ComunicacoesService } from './comunicacoes.service';
import { EmailService } from './email.service';
import { WhatsappService } from './whatsapp.service';

@Module({
  controllers: [ComunicacoesController],
  providers: [ComunicacoesService, EmailService, WhatsappService],
})
export class ComunicacoesModule {}
