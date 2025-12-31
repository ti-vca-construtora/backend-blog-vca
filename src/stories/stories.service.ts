import { Injectable, HttpException, HttpStatus } from '@nestjs/common'
import { PrismaService } from 'src/prisma/prisma.service'
import { CreateStoryDto } from './dto/create-story.dto'

import * as path from 'node:path'
import * as fs from 'node:fs/promises'
import { randomUUID } from 'node:crypto'

@Injectable()
export class StoriesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateStoryDto, file: Express.Multer.File) {
    const ext = path.extname(file.originalname)
    const fileName = `${randomUUID()}${ext}`

    const filePath = path.resolve(process.cwd(), 'files', fileName)
    await fs.writeFile(filePath, file.buffer)

    return this.prisma.story.create({
      data: {
        url: fileName,
        dataInicio: new Date(dto.dataInicio),
        dataTermino: new Date(dto.dataTermino),
      },
    })
  }

async findAtivos() {
  const now = new Date()

  return this.prisma.story.findMany({
    where: {
      dataInicio: { lte: now },
      dataTermino: { gte: now },
    },
    orderBy: { dataInicio: 'desc' },
  })
}

async findAll() {
  return this.prisma.story.findMany({
    orderBy: { dataInicio: 'desc' },
  })
}

async findOne(id: number) {
  const story = await this.prisma.story.findFirst({
    where: { id },
  })

  if (!story) {
    throw new HttpException('Story não encontrado', HttpStatus.NOT_FOUND)
  }

  return story
}

async delete(id: number) {
  const story = await this.prisma.story.findFirst({
    where: { id },
  })

  if (!story) {
    throw new HttpException('Story não encontrado', HttpStatus.NOT_FOUND)
  }

  await this.prisma.story.delete({
    where: { id },
  })

  return { message: 'Story removido com sucesso' }
}



}
