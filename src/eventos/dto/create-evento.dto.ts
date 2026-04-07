import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateEventoDto {
  @ApiProperty({
    example: 'Workshop de Tecnologia',
    description: 'Título do evento',
  })
  @IsString()
  @IsNotEmpty({ message: 'O título é obrigatório' })
  @MaxLength(150)
  titulo: string

  @ApiPropertyOptional({
    example: 'Evento voltado para desenvolvedores',
    description: 'Descrição do evento',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  descricao?: string

  @ApiPropertyOptional({
    example: 1,
    description: 'Prioridade do evento (quanto menor, maior a prioridade)',
  })
  @IsInt()
  @IsOptional()
  prioridade?: number

  @ApiPropertyOptional({
    example: 'Auditório Central',
    description: 'Local do evento',
  })
  @IsString()
  @IsOptional()
  @MaxLength(150)
  local?: string

  @ApiPropertyOptional({
    example: true,
    description: 'Status do evento',
  })
  @IsBoolean()
  @IsOptional()
  status?: boolean

  @ApiProperty({
    example: '2025-02-15',
    description: 'Data do evento',
  })
  @IsDateString({}, { message: 'Data do evento inválida' })
  dataEvento: string

  @ApiPropertyOptional({
    example: '19:00',
    description: 'Horário do evento',
  })
  @IsString()
  @IsOptional()
  horaEvento?: string
}
