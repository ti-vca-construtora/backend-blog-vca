import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  ParseFilePipeBuilder,
  HttpStatus,
  Get,
  Param,
  ParseIntPipe,
  Delete,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiTags,
} from '@nestjs/swagger'

import { StoriesService } from './stories.service'
import { CreateStoryDto } from './dto/create-story.dto'
import { AuthTokenGuard } from 'src/auth/guard/auth-token-guard'

@ApiTags('Stories')
@Controller('stories')
export class StoriesController {
  constructor(private readonly storiesService: StoriesService) {}

  // 🔒 Criar story (imagem ou vídeo)
  @UseGuards(AuthTokenGuard)
  @ApiBearerAuth('access-token')
  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Cadastro de story (imagem ou vídeo)',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Imagem ou vídeo do story',
        },
        dataInicio: {
          type: 'string',
          example: '2025-02-01',
        },
        dataTermino: {
          type: 'string',
          example: '2025-02-05',
        },
      },
      required: ['file', 'dataInicio', 'dataTermino'],
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  create(
    @Body() dto: CreateStoryDto,

    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: /jpeg|jpg|png|mp4|webm/,
        })
        .addMaxSizeValidator({
          maxSize: 10 * 1024 * 1024,
        })
        .build({
          fileIsRequired: true,
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        }),
    )
    file: Express.Multer.File,
  ) {
    return this.storiesService.create(dto, file)
  }

  // 🌍 Público — stories ativos
  @Get('ativos')
  findAtivos() {
    return this.storiesService.findAtivos()
  }

  // 🔒 Admin — listar todos
  @UseGuards(AuthTokenGuard)
  @ApiBearerAuth('access-token')
  @Get()
  findAll() {
    return this.storiesService.findAll()
  }

  // 🔒 Admin — buscar um
  @UseGuards(AuthTokenGuard)
  @ApiBearerAuth('access-token')
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.storiesService.findOne(id)
  }

  // 🔒 Admin — remover
  @UseGuards(AuthTokenGuard)
  @ApiBearerAuth('access-token')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.storiesService.delete(id)
  }
}
