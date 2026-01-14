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
  UseGuards,
  UseInterceptors,
  HttpStatus,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'

import {
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiConsumes,
  ApiTags,
  ApiOperation,
} from '@nestjs/swagger'

import { EventosService } from './eventos.service'
import { CreateEventoDto } from './dto/create-evento.dto'
import { UpdateEventoDto } from './dto/update-evento.dto'

import { AuthTokenGuard } from 'src/auth/guard/auth-token-guard'
import { TokenPayloadParam } from 'src/auth/param/token-payload.param'
import { PayloadTokenDto } from 'src/auth/dto/payload-token.dto'

@ApiTags('Eventos')
@ApiBearerAuth('access-token')
@Controller('eventos')
export class EventosController {
  constructor(private readonly eventosService: EventosService) {}

  @Get()
  findAll() {
    return this.eventosService.findAll()
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.eventosService.findOne(id)
  }

  // 🔹 Criar evento (imagem opcional)
  @UseGuards(AuthTokenGuard)
  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Cadastro de evento (imagem opcional)',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        titulo: { type: 'string' },
        descricao: { type: 'string' },
        prioridade: { type: 'number' },
        local: { type: 'string' },
        status: { type: 'boolean' },
        dataEvento: { type: 'string', example: '2025-02-15' },
        horaEvento: { type: 'string', example: '19:00' },
      },
      required: ['titulo', 'dataEvento'],
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  create(
    @Body() createEventoDto: CreateEventoDto,

    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({ fileType: /jpeg|jpg|png/ })
        .addMaxSizeValidator({ maxSize: 3 * 1024 * 1024 })
        .build({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
          fileIsRequired: false,
        }),
    )
    file: Express.Multer.File,

    @TokenPayloadParam() tokenPayload: PayloadTokenDto,
  ) {
    return this.eventosService.create(createEventoDto, file, tokenPayload)
  }

  // 🔹 Atualizar evento (imagem opcional)
  @UseGuards(AuthTokenGuard)
  @Patch(':id')
  @ApiParam({
  name: 'id',
  type: Number,
  description: 'ID do evento',
  example: 1,
})
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Atualização de evento (imagem opcional)',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        titulo: { type: 'string' },
        descricao: { type: 'string' },
        prioridade: { type: 'number' },
        local: { type: 'string' },
        status: { type: 'boolean' },
        dataEvento: { type: 'string' },
        horaEvento: { type: 'string' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateEventoDto: UpdateEventoDto,

    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({ fileType: /jpeg|jpg|png/ })
        .addMaxSizeValidator({ maxSize: 3 * 1024 * 1024 })
        .build({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
          fileIsRequired: false,
        }),
    )
    file: Express.Multer.File,

    @TokenPayloadParam() tokenPayload: PayloadTokenDto,
  ) {
    return this.eventosService.update(id, updateEventoDto, file, tokenPayload)
  }

  @UseGuards(AuthTokenGuard)
  @Delete(':id')
  @ApiParam({
  name: 'id',
  type: Number,
  description: 'ID do evento',
  example: 1,
})
  remove(
    @Param('id', ParseIntPipe) id: number,
    @TokenPayloadParam() tokenPayload: PayloadTokenDto,
  ) {
    return this.eventosService.delete(id, tokenPayload)
  }
}