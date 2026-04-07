import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateCategoriaDto {
  @ApiProperty({
    example: 'Tecnologia',
    description: 'Nome da categoria',
    maxLength: 100,
  })
  @IsString({ message: 'O nome deve ser uma string' })
  @IsNotEmpty({ message: 'O nome é obrigatório' })
  @MaxLength(100, { message: 'O nome pode ter no máximo 100 caracteres' })
  readonly nome: string

  @ApiPropertyOptional({
    example: 'fa-solid fa-laptop',
    description: 'Ícone da categoria (classe CSS ou identificador)',
    maxLength: 50,
  })
  @IsOptional()
  @IsString({ message: 'O ícone deve ser uma string' })
  @MaxLength(50, { message: 'O ícone pode ter no máximo 50 caracteres' })
  readonly icone?: string

  @ApiPropertyOptional({
    example: true,
    description: 'Status da categoria',
  })
  @IsOptional()
  @IsBoolean({ message: 'O status deve ser true ou false' })
  readonly status?: boolean
}
