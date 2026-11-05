import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateIntegranteGrupoDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  nome?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  telefone?: string;
}
