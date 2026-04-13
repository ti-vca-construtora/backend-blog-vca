import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from './email.service';
import { WhatsappService } from './whatsapp.service';
import {
  CanalMensagem,
  EnviarMensagemGrupoDto,
} from './dto/enviar-mensagem-grupo.dto';

function limparHtml(html: string): string {
  return html
    .replace(/<span[^>]*>/g, '') // remove spans
    .replace(/<\/span>/g, '')
    .replace(/ id="[^"]*"/g, '') // remove ids
    .replace(/ style="[^"]*"/g, '') // remove estilos pesados
    .replace(/<p>/g, '<p style="margin:0 0 16px;">'); // padroniza parágrafos
}

@Injectable()
export class ComunicacoesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly whatsappService: WhatsappService,
    private readonly configService: ConfigService,
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
      id: number;
      titulo: string;
      subtitulo?: string | null;
      imagem?: string | null;
      descricao?: string | null;
    },
  ): string {
    const baseUrl = (this.configService.get<string>('APP_URL') ?? '').replace(/\/$/, '');
    const siteUrl = (this.configService.get<string>('SITE_URL') ?? '').replace(/\/$/, '');

    if (!post) {
      return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;max-width:600px;width:100%;">
        <tr><td style="background:#1a1a1a;padding:20px 40px;text-align:center;">
          ${siteUrl ? `<img src="${siteUrl}/assets/logo-vca-BccREKY9.svg" alt="VCA Construtora" height="36" style="display:inline-block;" />` : '<span style="color:#fff;font-size:20px;font-weight:bold;">VCA Construtora</span>'}
        </td></tr>
        <tr><td style="padding:32px 40px;">
          <p style="font-size:16px;color:#333;margin:0 0 16px;">Ola, ${nome}.</p>
          <p style="font-size:15px;color:#555;line-height:1.7;margin:0;">${mensagem}</p>
        </td></tr>
        <tr><td style="background:#f4f4f4;padding:16px 40px;text-align:center;border-top:1px solid #e8e8e8;">
          <p style="font-size:12px;color:#999;margin:0;">© 2026 VCA Construtora. Todos os direitos reservados.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();
    }

    const imagemSrc = post.imagem
      ? (post.imagem.startsWith('http') ? post.imagem : `${baseUrl}/files/${post.imagem}`)
      : null;

    const imagemHtml = imagemSrc
      ? `<img src="${imagemSrc}" alt="${post.titulo}" style="max-width:100%;height:auto;display:block;margin:0 0 28px;border-radius:6px;" />`
      : '';

    const subtituloHtml = post.subtitulo
      ? `<p style="font-size:17px;color:#666;margin:0 0 24px;line-height:1.5;font-style:italic;">${post.subtitulo}</p>`
      : '';

    const descricaoComUrls = baseUrl && post.descricao
      ? post.descricao.replace(/src="(\/files\/)/g, `src="${baseUrl}/files/`)
      : post.descricao ?? '';

    const postLink = siteUrl ? `${siteUrl}/noticia/${post.id}` : '';

    const botaoHtml = postLink
      ? `<table cellpadding="0" cellspacing="0" style="margin:28px 0 0;"><tr><td style="background:#c8a55a;border-radius:4px;"><a href="${postLink}" style="display:inline-block;padding:12px 28px;color:#fff;text-decoration:none;font-size:14px;font-weight:bold;">Ler no site</a></td></tr></table>`
      : '';

    const logoHtml = siteUrl
      ? `<img src="${siteUrl}/assets/logo-vca-BccREKY9.svg" alt="VCA Construtora" height="36" style="display:inline-block;" />`
      : '<span style="color:#fff;font-size:20px;font-weight:bold;">VCA Construtora</span>';

    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;max-width:600px;width:100%;">

        <!-- Header VCA -->
        <tr><td style="background:#1a1a1a;padding:20px 40px;text-align:center;">
          ${logoHtml}
        </td></tr>

        <!-- Mensagem do remetente -->
        <tr><td style="padding:28px 40px 24px;border-bottom:1px solid #e8e8e8;">
          <p style="font-size:15px;color:#333;margin:0 0 8px;">Ola, ${nome}.</p>
          <p style="font-size:15px;color:#555;line-height:1.7;margin:0;">${mensagem}</p>
          ${botaoHtml}
        </td></tr>

        <!-- Conteudo do post -->
        <tr><td style="padding:32px 40px;">
          <h1 style="font-size:24px;color:#1a1a1a;margin:0 0 12px;line-height:1.3;">${post.titulo}</h1>
          ${subtituloHtml}
          ${imagemHtml}
          <div style="font-size:15px;color:#333;line-height:1.8;">${descricaoComUrls}</div>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#1a1a1a;padding:20px 40px;text-align:center;">
          <p style="font-size:12px;color:#aaa;margin:0;">© 2026 VCA Construtora. Todos os direitos reservados.</p>
        </td></tr>

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

    let post: { id: number; titulo: string; subtitulo?: string | null; imagem?: string | null; descricao?: string | null } | undefined;

    if (dto.postId) {
  const response = await fetch(
    `https://blog.vcatech.cloud/posts/${dto.postId}`
  );

  if (!response.ok) {
    throw new NotFoundException('Post nao encontrado na API.');
  }

  const postData = await response.json();


  post = {
    id: postData.id,
    titulo: postData.titulo,
    subtitulo: postData.subtitulo,
    imagem: postData.imagem,
    descricao: limparHtml(postData.descricao),
  };
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
            const assunto = dto.assunto ?? `Comunicado para grupo ${grupo!.nome}`;
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
              post,
            );
          }

          await this.prisma.historicoMensagem.create({
            data: {
              grupoId: grupo!.id,
              grupoNome: grupo!.nome,
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
              grupoId: grupo!.id,
              grupoNome: grupo!.nome,
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
