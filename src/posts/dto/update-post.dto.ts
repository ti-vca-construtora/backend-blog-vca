import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsInt, IsOptional, IsString, MaxLength } from 'class-validator'
import { Transform } from 'class-transformer'

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

  @ApiPropertyOptional({ example: 'Título otimizado para o Google', description: 'Título SEO (até 120 caracteres)' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() || null : value))
  @IsString()
  @MaxLength(120)
  @IsOptional()
  seoTitulo?: string | null

  @ApiPropertyOptional({ example: 'Resumo exibido nos resultados de busca', description: 'Descrição SEO (até 300 caracteres)' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() || null : value))
  @IsString()
  @MaxLength(300)
  @IsOptional()
  seoDescricao?: string | null

  @ApiPropertyOptional({ example: 'casa própria, Vitória da Conquista', description: 'Palavras-chave de foco separadas por vírgula (uso editorial interno)' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() || null : value))
  @IsString()
  @MaxLength(500)
  @IsOptional()
  palavrasChave?: string | null
}
