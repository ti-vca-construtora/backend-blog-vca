import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto{
      @ApiProperty({
        example: 'João da Silva',
        description: 'Nome completo do usuário',
      })
      @IsString()
      @IsNotEmpty()
      name: string
    
      @ApiProperty({
        example: 'joao@email.com',
        description: 'Email do usuário (único)',
      })
      @IsEmail()
      email: string
    
      @ApiProperty({
        example: '123456',
        description: 'Senha do usuário (mínimo 6 caracteres)',
      })
      @IsString()
      @MinLength(6)
      password: string
    
      @ApiPropertyOptional({
        example: 'Admin',
        description: 'Perfil do usuário (ex: Admin, Editor, User)',
      })
      @IsOptional()
      @IsString()
      role?: string
}