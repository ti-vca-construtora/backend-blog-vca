import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGrupoDto } from './dto/create-grupo.dto';
import { UpdateGrupoDto } from './dto/update-grupo.dto';
import { AdicionarIntegranteGrupoDto } from './dto/adicionar-usuario-grupo.dto';

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
          orderBy: {
            nome: 'asc',
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

  async addIntegrante(grupoId: number, dto: AdicionarIntegranteGrupoDto) {
    const grupo = await this.prisma.grupo.findUnique({ where: { id: grupoId } });
    if (!grupo || !grupo.ativo) {
      throw new NotFoundException('Grupo nao encontrado ou inativo.');
    }

    if (!dto.email && !dto.telefone) {
      throw new BadRequestException(
        'Informe ao menos email ou telefone para o integrante.',
      );
    }

    return this.prisma.grupoIntegrante.create({
      data: {
        grupoId,
        nome: dto.nome,
        email: dto.email,
        telefone: dto.telefone,
        ativo: true,
      },
    });
  }

  async removeIntegrante(grupoId: number, integranteId: number) {
    const registro = await this.prisma.grupoIntegrante.findFirst({
      where: {
        id: integranteId,
        grupoId,
      },
    });

    if (!registro || !registro.ativo) {
      throw new NotFoundException('Integrante nao esta ativo neste grupo.');
    }

    return this.prisma.grupoIntegrante.update({
      where: {
        id: integranteId,
      },
      data: {
        ativo: false,
      },
    });
  }
}
