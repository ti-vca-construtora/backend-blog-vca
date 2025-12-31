import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreatePostDto {
  @ApiProperty({
    example: 1,
    description: 'ID da categoria do post',
  })
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
  @IsBoolean()
  @IsOptional()
  status?: boolean
}