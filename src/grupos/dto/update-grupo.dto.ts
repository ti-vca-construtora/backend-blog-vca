import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateGrupoDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  nome?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  descricao?: string;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
