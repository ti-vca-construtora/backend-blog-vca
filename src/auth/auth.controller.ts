import { Body, Controller, Post } from '@nestjs/common';
import {  SignInDto } from './dto/signin.dto';
import { AuthService } from './auth.service';

import {
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post()
  @ApiOperation({ summary: 'Autenticar usuário' })
  @ApiBody({
    type: SignInDto,
    description: 'Credenciais para login',
  })
  @ApiResponse({
    status: 201,
    description: 'Usuário autenticado com sucesso',
    schema: {
      example: {
        id: 1,
        name: 'João Silva',
        email: 'joao@email.com',
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Credenciais inválidas',
  })
  signIn(@Body() signInDto: SignInDto) {
    return this.authService.authenticate(signInDto)
  }
}
