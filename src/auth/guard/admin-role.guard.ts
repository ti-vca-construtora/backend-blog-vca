import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { REQUEST_TOKEN_PAYLOAD_NAME } from '../common/auth.constants'

// Usar sempre depois do AuthTokenGuard, que valida o JWT e grava o payload na requisição.
@Injectable()
export class AdminRoleGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()
    const payload = request[REQUEST_TOKEN_PAYLOAD_NAME] as { sub?: number } | undefined

    if (!payload?.sub) {
      throw new UnauthorizedException('Token invalido.')
    }

    const user = await this.prisma.user.findUnique({
      where: { id: Number(payload.sub) },
      select: { active: true, role: true },
    })

    if (!user || !user.active) {
      throw new UnauthorizedException('Usuario inativo ou inexistente.')
    }

    if ((user.role ?? '').toLowerCase() !== 'admin') {
      throw new ForbiddenException('Acesso permitido apenas para admin.')
    }

    return true
  }
}
