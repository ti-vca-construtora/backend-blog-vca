import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseFilePipeBuilder,
  ParseIntPipe,
  Patch,
  Post,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  HttpStatus,
  Query,
} from '@nestjs/common'

import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiTags,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger'

import { PostsFilterDto } from './dto/posts-filter.dto'
import { FileInterceptor,FilesInterceptor, } from '@nestjs/platform-express'

import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto'
import { UpdatePostDto } from './dto/update-post.dto'

import { AuthTokenGuard } from 'src/auth/guard/auth-token-guard'
import { TokenPayloadParam } from 'src/auth/param/token-payload.param'
import { PayloadTokenDto } from 'src/auth/dto/payload-token.dto'

@ApiTags('Posts')
@ApiBearerAuth('access-token')
@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

@Get()
@ApiQuery({ name: 'search', required: false, type: String })
@ApiQuery({ name: 'categoriaId', required: false, type: Number })
@ApiQuery({ name: 'status', required: false, type: Boolean })
  findAll(@Query() filters:PostsFilterDto) {
    return this.postsService.findAll(filters)
  }

  @Get(':id')
  @ApiParam({
  name: 'id',
  type: Number,
  description: 'ID do post',
  example: 1,
})
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.postsService.findOne(id)
  }

  // 🔒 Criar post (imagem opcional)
  @UseGuards(AuthTokenGuard)
  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Cadastro de post (imagem opcional)',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Imagem principal do post (opcional)',
        },
        categoriaId: { type: 'number', example: 1 },
        titulo: { type: 'string', example: 'Título do post' },
        subtitulo: { type: 'string', example: 'Subtítulo opcional' },
        descricao: { type: 'string', example: 'Descrição do post' },
        status: { type: 'boolean', example: true },
      },
      required: ['categoriaId', 'titulo'],
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  create(
    @Body() createPostDto: CreatePostDto,

    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({ fileType: /jpeg|jpg|png/ })
        .addMaxSizeValidator({ maxSize: 3 * 1024 * 1024 })
        .build({
          fileIsRequired: false,
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        }),
    )
    file: Express.Multer.File,

    @TokenPayloadParam() tokenPayload: PayloadTokenDto,
  ) {
    return this.postsService.create(createPostDto, file, tokenPayload)
  }

  // 🔒 Upload de documentos extras
  @UseGuards(AuthTokenGuard)
  @Post(':id/documentos')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Upload de documentos do post',
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
      required: ['files'],
    },
  })
  @UseInterceptors(FilesInterceptor('files', 10))
  uploadDocumentos(
    @Param('id', ParseIntPipe) postId: number,

    @UploadedFiles(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({ fileType: /jpeg|jpg|png|pdf/ })
        .addMaxSizeValidator({ maxSize: 5 * 1024 * 1024 })
        .build({
          fileIsRequired: true,
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        }),
    )
    files: Express.Multer.File[],

    @TokenPayloadParam() tokenPayload: PayloadTokenDto,
  ) {
    return this.postsService.uploadDocumentos(postId, files, tokenPayload)
  }

  @UseGuards(AuthTokenGuard)
@Patch(':id')
@ApiParam({
  name: 'id',
  type: Number,
  description: 'ID do post',
  example: 1,
})
@ApiConsumes('multipart/form-data')
@ApiBody({
  description: 'Atualização do post (imagem opcional)',
  schema: {
    type: 'object',
    properties: {
      file: {
        type: 'string',
        format: 'binary',
        description: 'Nova imagem principal (opcional)',
      },
      categoriaId: { type: 'number', example: 1 },
      titulo: { type: 'string', example: 'Novo título' },
      subtitulo: { type: 'string' },
      descricao: { type: 'string' },
      status: { type: 'boolean', example: true },
    },
  },
})
@UseInterceptors(FileInterceptor('file'))
update(
  @Param('id', ParseIntPipe) id: number,
  @Body() updatePostDto: UpdatePostDto,

  @UploadedFile(
    new ParseFilePipeBuilder()
      .addFileTypeValidator({ fileType: /jpeg|jpg|png/ })
      .addMaxSizeValidator({ maxSize: 3 * 1024 * 1024 })
      .build({
        fileIsRequired: false,
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      }),
  )
  file: Express.Multer.File,

  @TokenPayloadParam() tokenPayload: PayloadTokenDto,
) {
  return this.postsService.update(id, updatePostDto, file, tokenPayload)
}


@UseGuards(AuthTokenGuard)
@Delete(':id/imagem')
@ApiParam({
  name: 'id',
  type: Number,
  description: 'ID do post',
  example: 1,
})
removeImagem(
  @Param('id', ParseIntPipe) id: number,
  @TokenPayloadParam() tokenPayload: PayloadTokenDto,
) {
  return this.postsService.removeImagem(id, tokenPayload)
}


@UseGuards(AuthTokenGuard)
@Delete('documentos/:id')
@ApiParam({
  name: 'id',
  type: Number,
  description: 'ID do documento',
})
removeDocumento(
  @Param('id', ParseIntPipe) id: number,
  @TokenPayloadParam() tokenPayload: PayloadTokenDto,
) {
  return this.postsService.removeDocumento(id, tokenPayload)
}



  @UseGuards(AuthTokenGuard)
  @Delete(':id')
  @ApiParam({
  name: 'id',
  type: Number,
  description: 'ID do post',
  example: 1,
})
  remove(
    @Param('id', ParseIntPipe) id: number,
    @TokenPayloadParam() tokenPayload: PayloadTokenDto,
  ) {
    return this.postsService.delete(id, tokenPayload)
  }
}
