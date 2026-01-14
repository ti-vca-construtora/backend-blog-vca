import { IsBoolean, IsDateString, IsNotEmpty, IsOptional } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class UpdateBannerDto  {
  @ApiProperty({
    example: '2025-01-01',
    description: 'Data de início do banner',
  })
  @IsDateString({}, { message: 'Data de início inválida' })
  @IsNotEmpty({ message: 'A data de início é obrigatória' })
  data_inicio: string

  @ApiPropertyOptional({
    example: '2025-01-31',
    description: 'Data de término do banner',
  })
  @IsDateString({}, { message: 'Data de término inválida' })
  @IsOptional()
  data_termino?: string

  @ApiPropertyOptional({
    example: true,
    description: 'Status do banner',
  })
  @IsBoolean()
  @IsOptional()
  status?: boolean

}
