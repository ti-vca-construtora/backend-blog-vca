import { Body, Controller, Get, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ComunicacoesService } from './comunicacoes.service';
import { EnviarMensagemGrupoDto } from './dto/enviar-mensagem-grupo.dto';

@Controller('comunicacoes')
export class ComunicacoesController {
  constructor(private readonly comunicacoesService: ComunicacoesService) {}

  @Post('grupos/enviar')
  enviarParaGrupo(@Body() dto: EnviarMensagemGrupoDto) {
    return this.comunicacoesService.enviarParaGrupo(dto);
  }

  @Get('historico')
  historico(
    @Query('grupoId', new ParseIntPipe({ optional: true })) grupoId?: number,
    @Query('canal') canal?: string,
    @Query('status') status?: string,
    @Query('postId', new ParseIntPipe({ optional: true })) postId?: number,
    @Query('pagina', new ParseIntPipe({ optional: true })) pagina?: number,
    @Query('limite', new ParseIntPipe({ optional: true })) limite?: number,
  ) {
    return this.comunicacoesService.historico({ grupoId, canal, status, postId, pagina, limite });
  }
}
