import { IsDateString } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class CreateStoryDto {
  @ApiProperty({
    example: '2025-02-01',
    description: 'Data de início de exibição do story',
  })
  @IsDateString()
  dataInicio: string

  @ApiProperty({
    example: '2025-02-05',
    description: 'Data final de exibição do story',
  })
  @IsDateString()
  dataTermino: string
}
