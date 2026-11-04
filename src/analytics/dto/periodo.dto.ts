import { ApiProperty } from '@nestjs/swagger'
import { Matches } from 'class-validator'

const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/

export class PeriodoDto {
  @ApiProperty({ example: '2026-10-01', description: 'Início do período (AAAA-MM-DD)' })
  @Matches(DATA_ISO, { message: 'inicio deve estar no formato AAAA-MM-DD' })
  inicio: string

  @ApiProperty({ example: '2026-10-28', description: 'Fim do período (AAAA-MM-DD), inclusive' })
  @Matches(DATA_ISO, { message: 'fim deve estar no formato AAAA-MM-DD' })
  fim: string
}
