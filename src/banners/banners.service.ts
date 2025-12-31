import { HttpException, HttpStatus, Injectable } from '@nestjs/common'
import { PrismaService } from 'src/prisma/prisma.service'
import { CreateBannerDto } from './dto/create-banner.dto'
import { UpdateBannerDto } from './dto/update-banner.dto'
import { PayloadTokenDto } from 'src/auth/dto/payload-token.dto'

import * as path from 'node:path'
import * as fs from 'node:fs/promises'
import { randomUUID } from 'node:crypto'

@Injectable()
export class BannersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.banner.findMany({
      orderBy: { createdAt: 'desc' },
    })
  }

  async findOne(id: number) {
    const banner = await this.prisma.banner.findFirst({
      where: { id_banner: id },
    })

    if (!banner) {
      throw new HttpException('Banner não encontrado', HttpStatus.NOT_FOUND)
    }

    return banner
  }

  async create(
    dto: CreateBannerDto,
    file: Express.Multer.File,
    _token: PayloadTokenDto,
  ) {
    if (!file) {
      throw new HttpException('Imagem do banner é obrigatória', HttpStatus.BAD_REQUEST)
    }

    const ext = path.extname(file.originalname)
    const fileName = `${randomUUID()}${ext}`
    const filePath = path.resolve(process.cwd(), 'files', fileName)

    await fs.writeFile(filePath, file.buffer)

    return this.prisma.banner.create({
      data: {
        url: fileName,
        data_inicio: new Date(dto.data_inicio),
        data_termino: dto.data_termino ? new Date(dto.data_termino) : null,
        status: dto.status ?? true,
      },
    })
  }

  async update(
    id: number,
    dto: UpdateBannerDto,
    _token: PayloadTokenDto,
  ) {
    const banner = await this.prisma.banner.findFirst({
      where: { id_banner: id },
    })

    if (!banner) {
      throw new HttpException('Banner não encontrado', HttpStatus.NOT_FOUND)
    }

    return this.prisma.banner.update({
      where: { id_banner: id },
      data: {
        data_inicio: dto.data_inicio
          ? new Date(dto.data_inicio)
          : banner.data_inicio,

        data_termino:
          dto.data_termino !== undefined
            ? new Date(dto.data_termino)
            : banner.data_termino,

        status: dto.status ?? banner.status,
      },
    })
  }

  async delete(id: number, _token: PayloadTokenDto) {
    const banner = await this.prisma.banner.findFirst({
      where: { id_banner: id },
    })

    if (!banner) {
      throw new HttpException('Banner não encontrado', HttpStatus.NOT_FOUND)
    }

    await this.prisma.banner.delete({
      where: { id_banner: id },
    })

    return { message: 'Banner removido com sucesso' }
  }
}