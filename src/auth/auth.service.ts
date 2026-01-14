import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common'
import { SignInDto } from './dto/signin.dto'
import { PrismaService } from 'src/prisma/prisma.service'
import { HashingServiceProtocol } from './hash/hashing.service'
import { JwtService } from '@nestjs/jwt'

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private readonly hashingService: HashingServiceProtocol,
    private readonly jwtService: JwtService,
  ) {}

  async authenticate(signInDto: SignInDto) {  

    const user = await this.prisma.user.findFirst({
      where: {
        email: signInDto.email,
        active: true,
      },
    })

    if (!user) {
      throw new HttpException('Falha ao autenticar', HttpStatus.UNAUTHORIZED)
    }

    const passwordValid = await this.hashingService.compare(
      signInDto.password,
      user.password,
    )

    if (!passwordValid) {
      throw new HttpException(
        'Senha/Usuário incorretos',
        HttpStatus.UNAUTHORIZED,
      )
    }

    // ✅ JWT usa automaticamente a config do JwtModule
    const token = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
    })

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      token,
    }
  }
}
