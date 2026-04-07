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

import {
  ApiTags,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger'



export class UpdateEventoDto  {
  @ApiProperty({
    example: 'Workshop de Tecnologia',
    description: 'Título do evento',
  })
  @IsString()
  @IsNotEmpty({ message: 'O título é obrigatório' })
  @MaxLength(150)
  @IsOptional()
  titulo: string

  @ApiPropertyOptional({
    example: 'Evento voltado para desenvolvedores',
    description: 'Descrição do evento',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  @IsOptional()
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
  @IsOptional()
  dataEvento: string

  @ApiPropertyOptional({
    example: '19:00',
    description: 'Horário do evento',
  })
  @IsString()
  @IsOptional()
  horaEvento?: string    
}
