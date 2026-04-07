import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGrupoDto } from './dto/create-grupo.dto';
import { UpdateGrupoDto } from './dto/update-grupo.dto';

@Injectable()
export class GruposService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateGrupoDto) {
    try {
      return await this.prisma.grupo.create({
        data: {
          nome: dto.nome,
          descricao: dto.descricao,
        },
      });
    } catch {
      throw new ConflictException('Ja existe um grupo com esse nome.');
    }
  }

  async findAll(ativo?: boolean) {
    return this.prisma.grupo.findMany({
      where: ativo === undefined ? undefined : { ativo },
      include: {
        _count: {
          select: {
            integrantes: {
              where: {
                ativo: true,
              },
            },
          },
        },
      },
      orderBy: {
        nome: 'asc',
      },
    });
  }

  async findOne(id: number) {
    const grupo = await this.prisma.grupo.findUnique({
      where: { id },
      include: {
        integrantes: {
          where: { ativo: true },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                active: true,
              },
            },
          },
        },
      },
    });

    if (!grupo) {
      throw new NotFoundException('Grupo nao encontrado.');
    }

    return grupo;
  }

  async update(id: number, dto: UpdateGrupoDto) {
    await this.findOne(id);

    try {
      return await this.prisma.grupo.update({
        where: { id },
        data: dto,
      });
    } catch {
      throw new ConflictException('Nao foi possivel atualizar o grupo.');
    }
  }

  async deactivate(id: number) {
    await this.findOne(id);

    return this.prisma.grupo.update({
      where: { id },
      data: { ativo: false },
    });
  }

  async addUser(grupoId: number, userId: number) {
    const grupo = await this.prisma.grupo.findUnique({ where: { id: grupoId } });
    if (!grupo || !grupo.ativo) {
      throw new NotFoundException('Grupo nao encontrado ou inativo.');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.active) {
      throw new NotFoundException('Usuario nao encontrado ou inativo.');
    }

    return this.prisma.grupoIntegrante.upsert({
      where: {
        grupoId_userId: {
          grupoId,
          userId,
        },
      },
      create: {
        grupoId,
        userId,
        ativo: true,
      },
      update: {
        ativo: true,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });
  }

  async removeUser(grupoId: number, userId: number) {
    const registro = await this.prisma.grupoIntegrante.findUnique({
      where: {
        grupoId_userId: {
          grupoId,
          userId,
        },
      },
    });

    if (!registro || !registro.ativo) {
      throw new NotFoundException('Usuario nao esta ativo neste grupo.');
    }

    return this.prisma.grupoIntegrante.update({
      where: {
        grupoId_userId: {
          grupoId,
          userId,
        },
      },
      data: {
        ativo: false,
      },
    });
  }
}
