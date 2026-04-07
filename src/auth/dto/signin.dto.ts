import { IsEmail, IsNotEmpty, IsString } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class SignInDto {
  @ApiProperty({
    example: 'usuario@email.com',
    description: 'Email do usuário',
  })
  @IsEmail()
  email: string

  @ApiProperty({
    example: '123456',
    description: 'Senha do usuário',
  })
  @IsString()
  @IsNotEmpty()
  password: string
}
