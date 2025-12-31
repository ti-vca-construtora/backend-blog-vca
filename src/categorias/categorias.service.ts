import { HttpException, HttpStatus, Injectable } from '@nestjs/common'
import { PrismaService } from 'src/prisma/prisma.service'
import { CreateCategoriaDto } from './dto/create-categoria.dto'
import { UpdateCategoriaDto } from './dto/update-categoria.dto'

@Injectable()
export class CategoriasService {
  constructor(private readonly prisma: PrismaService) {}

  // 🔹 Listar todas as categorias
  async findAll() {
    return this.prisma.categoria.findMany({
      orderBy: { nome: 'asc' },
      select: {
        id_categoria: true,
        nome: true,
        icone: true,
        status: true,
        createdAt: true,
      },
    })
  }

  // 🔹 Buscar categoria por ID
  async findOne(id: number) {
    const categoria = await this.prisma.categoria.findUnique({
      where: { id_categoria: id },
      select: {
        id_categoria: true,
        nome: true,
        icone: true,
        status: true,
        createdAt: true,
      },
    })

    if (!categoria) {
      throw new HttpException('Categoria não encontrada', HttpStatus.NOT_FOUND)
    }

    return categoria
  }

  // 🔹 Criar categoria
  async create(createCategoriaDto: CreateCategoriaDto) {
    try {
      return await this.prisma.categoria.create({
        data: {
          nome: createCategoriaDto.nome,
          icone: createCategoriaDto.icone,
          status: createCategoriaDto.status ?? true,
        },
        select: {
          id_categoria: true,
          nome: true,
          icone: true,
          status: true,
          createdAt: true,
        },
      })
    } catch (error) {
      throw new HttpException(
        'Erro ao criar categoria',
        HttpStatus.BAD_REQUEST,
      )
    }
  }

  // 🔹 Atualizar categoria
  async update(id: number, updateCategoriaDto: UpdateCategoriaDto) {
    const categoria = await this.prisma.categoria.findUnique({
      where: { id_categoria: id },
    })

    if (!categoria) {
      throw new HttpException('Categoria não encontrada', HttpStatus.NOT_FOUND)
    }

    try {
      return await this.prisma.categoria.update({
        where: { id_categoria: id },
        data: {
          nome: updateCategoriaDto.nome,
          icone: updateCategoriaDto.icone,
          status: updateCategoriaDto.status,
        },
        select: {
          id_categoria: true,
          nome: true,
          icone: true,
          status: true,
          createdAt: true,
        },
      })
    } catch (error) {
      throw new HttpException(
        'Erro ao atualizar categoria',
        HttpStatus.BAD_REQUEST,
      )
    }
  }

  // 🔹 Remover categoria
  async remove(id: number) {
    const categoria = await this.prisma.categoria.findUnique({
      where: { id_categoria: id },
    })

    if (!categoria) {
      throw new HttpException('Categoria não encontrada', HttpStatus.NOT_FOUND)
    }

    try {
      await this.prisma.categoria.delete({
        where: { id_categoria: id },
      })

      return { message: 'Categoria removida com sucesso' }
    } catch (error) {
      throw new HttpException(
        'Erro ao remover categoria',
        HttpStatus.BAD_REQUEST,
      )
    }
  }
}
