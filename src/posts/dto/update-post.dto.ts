import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator'

export class UpdatePostDto {
  @ApiPropertyOptional({ example: 1 })
  @IsInt()
  @IsOptional()
  categoriaId?: number

  @ApiPropertyOptional({ example: 'Novo título' })
  @IsString()
  @IsOptional()
  titulo?: string

  @ApiPropertyOptional({ example: 'Novo subtítulo' })
  @IsString()
  @IsOptional()
  subtitulo?: string

  @ApiPropertyOptional({ example: 'Nova descrição' })
  @IsString()
  @IsOptional()
  descricao?: string

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  status?: boolean
}
