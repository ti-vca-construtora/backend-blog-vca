import { HttpException, HttpStatus, Injectable } from '@nestjs/common'
import { PrismaService } from 'src/prisma/prisma.service'
import { CreatePostDto } from './dto/create-post.dto'
import { UpdatePostDto } from './dto/update-post.dto'
import { PayloadTokenDto } from 'src/auth/dto/payload-token.dto'

import * as path from 'node:path'
import * as fs from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { PostsFilterDto } from './dto/posts-filter.dto'

@Injectable()
export class PostsService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters: PostsFilterDto) {
     const {search, categoriaId, status} = filters;

    return this.prisma.post.findMany({
      where: {
      ...(search && {
        OR: [
          { titulo: { contains: search } },
          { subtitulo: { contains: search } },
          { descricao: { contains: search } },
        ],
      }),

      ...(categoriaId && { categoriaId }),
      ...(status !== undefined && { status }),
    },
      include: {
        categoria: true,
        criadoPor: { select: { id: true, name: true } },
      },
      orderBy: { criadoEm: 'desc' },
    })
  }

  async findOne(id: number) {
    const post = await this.prisma.post.findFirst({
      where: { id },
      include: {
        categoria: true,
        documentos: true,
      },
    })

    if (!post) {
      throw new HttpException('Post não encontrado', HttpStatus.NOT_FOUND)
    }

    return post
  }

  async create(
    dto: CreatePostDto,
    file: Express.Multer.File,
    token: PayloadTokenDto,
  ) {
    let imageName: string | null = null

    if (file) {
      const ext = path.extname(file.originalname)
      imageName = `${randomUUID()}${ext}`

      const filePath = path.resolve(process.cwd(), 'files', imageName)
      await fs.writeFile(filePath, file.buffer)
    }

    return this.prisma.post.create({
      data: {
        categoriaId: dto.categoriaId,
        titulo: dto.titulo,
        subtitulo: dto.subtitulo,
        descricao: dto.descricao,
        status: dto.status ?? true,
        imagem: imageName,
        criadoPorId: token.sub,
      },
    })
  }

  async uploadDocumentos(
  postId: number,
  files: Express.Multer.File[],
  token: PayloadTokenDto,
) {
  const post = await this.prisma.post.findFirst({
    where: { id: postId },
  })

  if (!post) {
    throw new HttpException('Post não encontrado', HttpStatus.NOT_FOUND)
  }

  // if (post.criadoPorId !== token.sub) {
  //   throw new HttpException('Acesso negado', HttpStatus.FORBIDDEN)
  // }

const documentos: { postId: number; url: string }[] = []

for (const file of files) {
  const ext = path.extname(file.originalname)
  const fileName = `${randomUUID()}${ext}`

  const filePath = path.resolve(process.cwd(), 'files', fileName)
  await fs.writeFile(filePath, file.buffer)

  documentos.push({
    postId,
    url: fileName,
  })
}

await this.prisma.postDocumento.createMany({
  data: documentos,
})


  return {
    message: 'Documentos adicionados com sucesso',
    total: documentos.length,
  }
}


  async update(
    id: number,
    dto: UpdatePostDto,
    token: PayloadTokenDto,
  ) {
    const post = await this.prisma.post.findFirst({ where: { id } })

    if (!post) {
      throw new HttpException('Post não encontrado', HttpStatus.NOT_FOUND)
    }

    // if (post.criadoPorId !== token.sub) {
    //   throw new HttpException('Acesso negado', HttpStatus.FORBIDDEN)
    // }

    return this.prisma.post.update({
      where: { id },
      data: {
        ...dto,
        atualizadoPorId: token.sub,
      },
    })
  }

  async delete(id: number, token: PayloadTokenDto) {
    const post = await this.prisma.post.findFirst({ where: { id } })

    if (!post) {
      throw new HttpException('Post não encontrado', HttpStatus.NOT_FOUND)
    }

    // if (post.criadoPorId !== token.sub) {
    //   throw new HttpException('Acesso negado', HttpStatus.FORBIDDEN)
    // }

    await this.prisma.post.delete({ where: { id } })

    return { message: 'Post removido com sucesso' }
  }
}
