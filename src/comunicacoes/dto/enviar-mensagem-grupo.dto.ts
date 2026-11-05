import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export enum CanalMensagem {
  EMAIL = 'email',
  WHATSAPP = 'whatsapp',
}

export class EnviarMensagemGrupoDto {
  @IsInt()
  @Min(1)
  grupoId!: number;

  @IsEnum(CanalMensagem)
  canal!: CanalMensagem;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  assunto?: string;

  @IsString()
  @IsNotEmpty()
  mensagem!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  postId?: number;
}
