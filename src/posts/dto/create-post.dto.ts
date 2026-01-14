import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'

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
}