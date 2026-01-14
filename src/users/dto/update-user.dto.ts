import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateUserDto{
      @ApiPropertyOptional({
        example: 'João da Silva',
        description: 'Nome completo do usuário',
      })
      @IsOptional()
      @IsString()
      name?: string
    
      @ApiPropertyOptional({
        example: 'joao@email.com',
        description: 'Email do usuário (único)',
      })
      @IsOptional()
      @IsEmail()
      email?: string
    
      @ApiPropertyOptional({
        example: '123456',
        description: 'Senha do usuário (mínimo 6 caracteres)',
      })
      @IsOptional()
      @IsString()
      @MinLength(6)
      password?: string
    
      @ApiPropertyOptional({
        example: 'Admin',
        description: 'Perfil do usuário (ex: Admin, Editor, User)',
      })
      @IsOptional()
      @IsString()
      role?: string
}
