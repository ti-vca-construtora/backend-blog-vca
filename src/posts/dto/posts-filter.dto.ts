import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'

export class PostsFilterDto {
  @ApiPropertyOptional({
    description: 'Texto para busca no título, subtítulo ou descrição',
    example: 'evento',
  })
  @IsOptional()
  @IsString()
  search?: string

  @ApiPropertyOptional({
    description: 'ID da categoria',
    example: 2,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  categoriaId?: number

  @ApiPropertyOptional({
    description: 'Status do post (true = ativo, false = inativo)',
    example: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  status?: boolean
}
