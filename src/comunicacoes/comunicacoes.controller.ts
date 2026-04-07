import { Body, Controller, Post } from '@nestjs/common';
import { ComunicacoesService } from './comunicacoes.service';
import { EnviarMensagemGrupoDto } from './dto/enviar-mensagem-grupo.dto';

@Controller('comunicacoes')
export class ComunicacoesController {
  constructor(private readonly comunicacoesService: ComunicacoesService) {}

  @Post('grupos/enviar')
  enviarParaGrupo(@Body() dto: EnviarMensagemGrupoDto) {
    return this.comunicacoesService.enviarParaGrupo(dto);
  }
}
