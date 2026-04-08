import {
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WhatsappService {
  private readonly baseUrl = 'https://api.huggy.app/v3';

  constructor(private readonly configService: ConfigService) {}

  private get token(): string {
    const token = this.configService.get<string>('HUGGY_TOKEN');
    if (!token) {
      throw new InternalServerErrorException('HUGGY_TOKEN nao configurado.');
    }
    return token;
  }

  private get flowId(): string {
    return this.configService.get<string>('HUGGY_FLOW_ID') ?? '473129';
  }

  private get uuid(): string {
    const uuid = this.configService.get<string>('HUGGY_UUID');
    if (!uuid) {
      throw new InternalServerErrorException('HUGGY_UUID nao configurado.');
    }
    return uuid;
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'Accept-Language': 'pt-br',
    };
  }

  async buscarContatoPorTelefone(phone: string): Promise<{ id: number } | null> {
    const response = await fetch(`${this.baseUrl}/contacts?phone=${phone}`, {
      method: 'GET',
      headers: this.headers(),
    });

    if (!response.ok) {
      throw new InternalServerErrorException('Erro ao buscar contato Huggy.');
    }

    const data = (await response.json()) as Array<{ id: number }>;
    return data?.[0] ?? null;
  }

  async criarContato(nome: string, phone: string): Promise<{ id: number }> {
    const response = await fetch(`${this.baseUrl}/contacts`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        name: nome,
        phone,
      }),
    });

    if (!response.ok) {
      throw new InternalServerErrorException('Erro ao criar contato Huggy.');
    }

    return (await response.json()) as { id: number };
  }

  async executarFlow(
    contactId: number,
    variables: Record<string, string>,
  ): Promise<unknown> {
    const response = await fetch(`${this.baseUrl}/contacts/${contactId}/execFlow`, {
      method: 'PUT',
      headers: this.headers(),
      body: JSON.stringify({
        uuid: this.uuid,
        flowId: this.flowId,
        variables,
        whenInChat: true,
        whenWaitForChat: false,
        whenInAuto: true,
      }),
    });

    const text = await response.text();
    if (!response.ok) {
      throw new InternalServerErrorException(`Erro ao executar flow Huggy: ${text}`);
    }

    return text ? (JSON.parse(text) as unknown) : null;
  }

  async enviarMensagem(phone: string, nome: string, mensagem: string): Promise<void> {
    const contatoExistente = await this.buscarContatoPorTelefone(phone);
    const contato = contatoExistente ?? (await this.criarContato(nome, phone));

    await this.executarFlow(contato.id, {
      nome,
      mensagem,
    });
  }
}
