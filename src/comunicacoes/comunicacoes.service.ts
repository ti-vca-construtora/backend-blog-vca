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

        if (dto.canal === CanalMensagem.EMAIL) {
          if (!integrante.email) {
            throw new Error('Integrante sem email.');
          }

          const assunto = dto.assunto ?? `Comunicado para grupo ${grupo.nome}`;
          const html = `<p>Ola, ${nome}.</p><p>${dto.mensagem}</p>`;

          await this.emailService.send({
            to: integrante.email,
            subject: assunto,
            html,
          });
          return integrante.id;
        }

        if (!integrante.telefone) {
          throw new Error('Integrante sem telefone.');
        }

        await this.whatsappService.enviarMensagem(
          integrante.telefone,
          nome,
          dto.mensagem,
        );
        return integrante.id;
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
