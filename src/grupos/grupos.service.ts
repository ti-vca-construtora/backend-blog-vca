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
import { UpdateIntegranteGrupoDto } from './dto/update-integrante-grupo.dto';
import * as XLSX from 'xlsx';

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

  async remove(id: number) {
    const grupo = await this.prisma.grupo.findUnique({ where: { id } });
    if (!grupo) {
      throw new NotFoundException('Grupo nao encontrado.');
    }

    await this.prisma.grupo.delete({ where: { id } });
    return { message: 'Grupo e todos os seus integrantes foram removidos.' };
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

  async updateIntegrante(
    grupoId: number,
    integranteId: number,
    dto: UpdateIntegranteGrupoDto,
  ) {
    const registro = await this.prisma.grupoIntegrante.findFirst({
      where: { id: integranteId, grupoId },
    });

    if (!registro || !registro.ativo) {
      throw new NotFoundException('Integrante nao esta ativo neste grupo.');
    }

    return this.prisma.grupoIntegrante.update({
      where: { id: integranteId },
      data: {
        nome: dto.nome,
        email: dto.email,
        telefone: dto.telefone,
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

  async importarIntegrantes(grupoId: number, buffer: Buffer) {
    const grupo = await this.prisma.grupo.findUnique({ where: { id: grupoId } });
    if (!grupo || !grupo.ativo) {
      throw new NotFoundException('Grupo não encontrado ou inativo.');
    }

    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: Array<Record<string, unknown>> = XLSX.utils.sheet_to_json(sheet);

    if (!rows.length) {
      throw new BadRequestException('Planilha vazia ou sem dados válidos.');
    }

    const inseridos: number[] = [];
    const erros: { linha: number; motivo: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const linha = i + 2; // linha 1 é o cabeçalho

      const nome = String(row['nome'] ?? row['Nome'] ?? '').trim();
      const telefone = row['telefone'] ?? row['Telefone'];
      const email = row['email'] ?? row['Email'];

      if (!nome) {
        erros.push({ linha, motivo: 'nome é obrigatório.' });
        continue;
      }

      const telefoneStr = telefone ? String(telefone).trim() : undefined;
      const emailStr = email ? String(email).trim() : undefined;

      if (!emailStr && !telefoneStr) {
        erros.push({ linha, motivo: 'Informe ao menos email ou telefone.' });
        continue;
      }

      try {
        const integrante = await this.prisma.grupoIntegrante.create({
          data: {
            grupoId,
            nome,
            telefone: telefoneStr,
            email: emailStr,
            ativo: true,
          },
        });
        inseridos.push(integrante.id);
      } catch {
        erros.push({ linha, motivo: 'Erro ao inserir integrante.' });
      }
    }

    return {
      totalLinhas: rows.length,
      inseridos: inseridos.length,
      erros,
    };
  }
}
