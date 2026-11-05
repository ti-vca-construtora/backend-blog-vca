import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Transform, Type } from 'class-transformer'

export class CreatePostDto {
  @ApiProperty({
    example: 1,
    description: 'ID da categoria do post',
  })
  @Type(()=>Number)
  @IsInt()
  categoriaId: number

  @ApiProperty({
    example: 'Título do post',
  })
  @IsString()
  @IsNotEmpty()
  titulo: string

  @ApiPropertyOptional({
    example: 'Subtítulo opcional',
  })
  @IsString()
  @IsOptional()
  subtitulo?: string

  @ApiPropertyOptional({
    example: 'Descrição completa do post',
  })
  @IsString()
  @IsOptional()
  descricao?: string

  @ApiPropertyOptional({
    example: true,
    description: 'Status do post (ativo/inativo)',
  })
  @Type(() => Boolean)
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