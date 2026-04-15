import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

@Injectable()
export class EmailService {
  private readonly resend?: Resend;
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    if (apiKey) {
      this.resend = new Resend(apiKey);
    }
  }

  async send(params: SendEmailParams): Promise<boolean> {
    if (!this.resend) {
      throw new InternalServerErrorException(
        'RESEND_API_KEY nao configurada para envio de email.',
      );
    }

    const from = this.configService.get<string>('EMAIL_FROM');
    if (!from) {
      throw new InternalServerErrorException(
        'EMAIL_FROM nao configurado para envio de email.',
      );
    }

    try {
      const result = await this.resend.emails.send({
        from,
        to: params.to,
        subject: params.subject,
        html: params.html,
      });
      this.logger.log(`Email enviado para ${params.to} | id: ${result?.data?.id}`);
      return true;
    } catch (err) {
      this.logger.error(`Erro ao enviar email para ${params.to}: ${JSON.stringify(err)}`);
      throw new InternalServerErrorException('Erro ao enviar email.');
    }
  }
}
