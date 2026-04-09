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

  private buildEmailHtml(
    nome: string,
    mensagem: string,
    post?: {
      titulo: string;
      subtitulo?: string | null;
      imagem?: string | null;
      descricao?: string | null;
    },
  ): string {
    if (!post) {
      return `<p>Ola, ${nome}.</p><p>${mensagem}</p>`;
    }

    const imagemHtml = post.imagem
      ? `<img src="${post.imagem}" alt="${post.titulo}" style="max-width:100%;height:auto;display:block;margin:0 auto 24px;" />`
      : '';

    const subtituloHtml = post.subtitulo
      ? `<h2 style="font-size:18px;color:#555;margin:0 0 16px;">${post.subtitulo}</h2>`
      : '';

    const descricaoHtml = post.descricao
      ? `<div style="font-size:15px;color:#333;line-height:1.7;margin-bottom:24px;">${post.descricao}</div>`
      : '';

    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;max-width:600px;width:100%;">
        <tr>
          <td style="padding:32px 40px 0;">
            <p style="font-size:16px;color:#333;margin:0 0 24px;">Ola, ${nome}.</p>
            <p style="font-size:15px;color:#555;margin:0 0 32px;">${mensagem}</p>
          </td>
        </tr>
        <tr>
          <td style="background:#f9f9f9;padding:28px 40px;border-top:1px solid #e8e8e8;">
            <h1 style="font-size:22px;color:#222;margin:0 0 12px;">${post.titulo}</h1>
            ${subtituloHtml}
            ${imagemHtml}
            ${descricaoHtml}
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();
  }

  async enviarParaGrupo(dto: EnviarMensagemGrupoDto) {
    const grupo = await this.prisma.grupo.findUnique({
      where: { id: dto.grupoId },
    });

    if (!grupo || !grupo.ativo) {
      throw new NotFoundException('Grupo nao encontrado ou inativo.');
    }

    let post: { titulo: string; subtitulo?: string | null; imagem?: string | null; descricao?: string | null } | undefined;

    if (dto.postId) {
      const postEncontrado = await this.prisma.post.findFirst({
        where: { id: dto.postId },
        select: { titulo: true, subtitulo: true, imagem: true, descricao: true },
      });

      if (!postEncontrado) {
        throw new NotFoundException('Post nao encontrado.');
      }

      post = postEncontrado;
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
            const html = this.buildEmailHtml(nome, dto.mensagem, post);

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
