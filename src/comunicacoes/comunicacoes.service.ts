import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from './email.service';
import { WhatsappService } from './whatsapp.service';
import {
  CanalMensagem,
  EnviarMensagemGrupoDto,
} from './dto/enviar-mensagem-grupo.dto';

@Injectable()
export class ComunicacoesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly whatsappService: WhatsappService,
  ) {}

  async historico(filtros: {
    grupoId?: number;
    canal?: string;
    status?: string;
    pagina?: number;
    limite?: number;
  }) {
    const pagina = filtros.pagina && filtros.pagina > 0 ? filtros.pagina : 1;
    const limite = filtros.limite && filtros.limite > 0 ? Math.min(filtros.limite, 100) : 20;
    const skip = (pagina - 1) * limite;

    const where = {
      ...(filtros.grupoId ? { grupoId: filtros.grupoId } : {}),
      ...(filtros.canal ? { canal: filtros.canal } : {}),
      ...(filtros.status ? { status: filtros.status } : {}),
    };

    const [total, dados] = await Promise.all([
      this.prisma.historicoMensagem.count({ where }),
      this.prisma.historicoMensagem.findMany({
        where,
        orderBy: { criadoEm: 'desc' },
        skip,
        take: limite,
      }),
    ]);

    return {
      total,
      pagina,
      limite,
      totalPaginas: Math.ceil(total / limite),
      dados,
    };
  }

  async enviarParaGrupo(dto: EnviarMensagemGrupoDto) {
    const grupo = await this.prisma.grupo.findUnique({
      where: { id: dto.grupoId },
    });

    if (!grupo || !grupo.ativo) {
      throw new NotFoundException('Grupo nao encontrado ou inativo.');
    }

    const integrantes = await this.prisma.grupoIntegrante.findMany({
      where: {
        grupoId: dto.grupoId,
        ativo: true,
      },
    });

    if (integrantes.length === 0) {
      throw new BadRequestException('Grupo sem integrantes ativos para envio.');
    }

    const resultados = await Promise.allSettled(
      integrantes.map(async (integrante) => {
        const nome = integrante.nome ?? 'Integrante';
        let destinatario = '';
        let erroMsg: string | undefined;

        try {
          if (dto.canal === CanalMensagem.EMAIL) {
            if (!integrante.email) {
              throw new Error('Integrante sem email.');
            }

            destinatario = integrante.email;
            const assunto = dto.assunto ?? `Comunicado para grupo ${grupo.nome}`;
            const html = `<p>Ola, ${nome}.</p><p>${dto.mensagem}</p>`;

            await this.emailService.send({
              to: integrante.email,
              subject: assunto,
              html,
            });
          } else {
            if (!integrante.telefone) {
              throw new Error('Integrante sem telefone.');
            }

            destinatario = integrante.telefone;
            await this.whatsappService.enviarMensagem(
              integrante.telefone,
              nome,
              dto.mensagem,
            );
          }

          await this.prisma.historicoMensagem.create({
            data: {
              grupoId: grupo.id,
              grupoNome: grupo.nome,
              integranteId: integrante.id,
              integranteNome: nome,
              destinatario,
              canal: dto.canal,
              assunto: dto.assunto ?? null,
              mensagem: dto.mensagem,
              status: 'enviado',
            },
          });

          return integrante.id;
        } catch (err) {
          erroMsg = err instanceof Error ? err.message : String(err);

          await this.prisma.historicoMensagem.create({
            data: {
              grupoId: grupo.id,
              grupoNome: grupo.nome,
              integranteId: integrante.id,
              integranteNome: nome,
              destinatario: destinatario || (dto.canal === CanalMensagem.EMAIL ? integrante.email ?? '' : integrante.telefone ?? ''),
              canal: dto.canal,
              assunto: dto.assunto ?? null,
              mensagem: dto.mensagem,
              status: 'falha',
              erro: erroMsg,
            },
          });

          throw err;
        }
      }),
    );

    const enviados = resultados.filter((item) => item.status === 'fulfilled').length;
    const falhas = resultados.length - enviados;

    return {
      grupoId: dto.grupoId,
      canal: dto.canal,
      totalIntegrantes: integrantes.length,
      enviados,
      falhas,
    };
  }
}
