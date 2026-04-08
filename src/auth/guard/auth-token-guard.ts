import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { Request } from 'express'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { REQUEST_TOKEN_PAYLOAD_NAME } from '../common/auth.constants'
import { PrismaService } from 'src/prisma/prisma.service'

@Injectable()
export class AuthTokenGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: Request = context.switchToHttp().getRequest()

   // console.log('HEADERS RECEBIDOS:', request.headers);

    const token = this.extractTokenHeader(request)

    if (!token) {
      throw new UnauthorizedException('Token nao encontrado')
    }

    try {
      const jwtSecret = this.configService.get<string>('JWT_SECRET')
      const jwtAudience = this.configService.get<string>('JWT_TOKEN_AUDIENCE')
      const jwtIssuer = this.configService.get<string>('JWT_TOKEN_ISSUER')

      const payload = await this.jwtService.verifyAsync(token, {
        secret: jwtSecret,
        audience: jwtAudience,
        issuer: jwtIssuer,
      })

      //  NORMALIZAÇÃO CRÍTICA
      payload.sub = Number(payload.sub)

      if (Number.isNaN(payload.sub)) {
        throw new UnauthorizedException('Token inválido')
      }

      request[REQUEST_TOKEN_PAYLOAD_NAME] = payload 

      // const user = await this.prisma.user.findFirst({
      //   where: {
      //     id: payload.sub,
      //   },
      // })

      // if (!user || !user.active) {
      //   throw new UnauthorizedException('Acesso nao autorizado')
      // }

      return true
    } catch {
      throw new UnauthorizedException('Token invalido ou expirado')
    }
  }

  private extractTokenHeader(request: Request): string | undefined {
    const authorization = request.headers.authorization

    if (!authorization) return

    const [type, token] = authorization.split(' ')

    if (type !== 'Bearer') return

    return token
  }
}
