import {
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WhatsappService {
  private readonly baseUrl = 'https://api.botmaker.com/v2.0';

  constructor(private readonly configService: ConfigService) {}

  private get accessToken(): string {
    const token = this.configService.get<string>('BOTMAKER_ACCESS_TOKEN');
    if (!token) {
      throw new InternalServerErrorException('BOTMAKER_ACCESS_TOKEN nao configurado.');
    }
    return token;
  }

  private get channelId(): string {
    const channelId = this.configService.get<string>('BOTMAKER_CHANNEL_ID');
    if (!channelId) {
      throw new InternalServerErrorException('BOTMAKER_CHANNEL_ID nao configurado.');
    }
    return channelId;
  }

  private headers(): Record<string, string> {
    return {
      'access-token': this.accessToken,
      'Content-Type': 'application/json',
    };
  }

  async enviarMensagem(
    phone: string,
    _nome: string,
    _mensagem: string,
    post?: { id: number; titulo: string },
  ): Promise<void> {
    const variables: Record<string, string> = post
      ? { blog_title: post.titulo, blog_link: String(post.id) }
      : {};

    const body = {
      chat: {
        channelId: this.channelId,
        contactId: phone,
      },
      intentIdOrName: 'blog_notificacao',
      variables,
    };

    const response = await fetch(`${this.baseUrl}/chats-actions/trigger-intent`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
    });

    const text = await response.text();
    if (!response.ok) {
      throw new InternalServerErrorException(`Erro ao enviar WhatsApp Botmaker: ${text}`);
    }
  }
}
