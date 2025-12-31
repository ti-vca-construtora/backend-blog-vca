import { HttpException, HttpStatus, Injectable } from '@nestjs/common'
import { PrismaService } from 'src/prisma/prisma.service'
import { CreateEventoDto } from './dto/create-evento.dto'
import { UpdateEventoDto } from './dto/update-evento.dto'
import { PayloadTokenDto } from 'src/auth/dto/payload-token.dto'

import * as path from 'node:path'
import * as fs from 'node:fs/promises'
import { randomUUID } from 'node:crypto'

@Injectable()
export class EventosService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.evento.findMany({
      include: {
        criadoPor: { select: { id: true, name: true } },
      },
      orderBy: { dataEvento: 'asc' },
    })
  }

  async findOne(id: number) {
    const evento = await this.prisma.evento.findFirst({
      where: { id },
      include: {
        criadoPor: { select: { id: true, name: true } },
      },
    })

    if (!evento) {
      throw new HttpException('Evento não encontrado', HttpStatus.NOT_FOUND)
    }

    return evento
  }

  async create(
    dto: CreateEventoDto,
    file: Express.Multer.File | undefined,
    token: PayloadTokenDto,
  ) {
    let imageName: string | null = null

    if (file) {
      const ext = path.extname(file.originalname)
      imageName = `${randomUUID()}${ext}`

      const filePath = path.resolve(process.cwd(), 'files', imageName)
      await fs.writeFile(filePath, file.buffer)
    }

    return this.prisma.evento.create({
      data: {
        titulo: dto.titulo,
        descricao: dto.descricao,
        prioridade: dto.prioridade,
        local: dto.local,
        imagem: imageName,
        status: dto.status ?? true,
        dataEvento: new Date(dto.dataEvento),
        horaEvento: dto.horaEvento,
        criadoPorId: token.sub,
      },
    })
  }

  async update(
    id: number,
    dto: UpdateEventoDto,
    file: Express.Multer.File | undefined,
    token: PayloadTokenDto,
  ) {
    const evento = await this.prisma.evento.findFirst({ where: { id } })

    if (!evento) {
      throw new HttpException('Evento não encontrado', HttpStatus.NOT_FOUND)
    }

    if (evento.criadoPorId !== token.sub) {
      throw new HttpException('Acesso negado', HttpStatus.FORBIDDEN)
    }

    let imageName = evento.imagem

    if (file) {
      const ext = path.extname(file.originalname)
      imageName = `${randomUUID()}${ext}`

      const filePath = path.resolve(process.cwd(), 'files', imageName)
      await fs.writeFile(filePath, file.buffer)
    }

    return this.prisma.evento.update({
      where: { id },
      data: {
        ...dto,
        imagem: imageName,
        atualizadoPorId: token.sub,
      },
    })
  }

  async delete(id: number, token: PayloadTokenDto) {
    const evento = await this.prisma.evento.findFirst({ where: { id } })

    if (!evento) {
      throw new HttpException('Evento não encontrado', HttpStatus.NOT_FOUND)
    }

    if (evento.criadoPorId !== token.sub) {
      throw new HttpException('Acesso negado', HttpStatus.FORBIDDEN)
    }

    await this.prisma.evento.delete({ where: { id } })

    return { message: 'Evento removido com sucesso' }
  }
}
