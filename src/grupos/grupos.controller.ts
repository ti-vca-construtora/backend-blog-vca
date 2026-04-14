import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseBoolPipe,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { GruposService } from './grupos.service';
import { CreateGrupoDto } from './dto/create-grupo.dto';
import { UpdateGrupoDto } from './dto/update-grupo.dto';
import { AdicionarIntegranteGrupoDto } from './dto/adicionar-usuario-grupo.dto';
import { UpdateIntegranteGrupoDto } from './dto/update-integrante-grupo.dto';

const ALLOWED_SHEET_MIMETYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
];

@Controller('grupos')
export class GruposController {
  constructor(private readonly gruposService: GruposService) {}

  @Post()
  create(@Body() dto: CreateGrupoDto) {
    return this.gruposService.create(dto);
  }

  @Get()
  findAll(@Query('ativo', new ParseBoolPipe({ optional: true })) ativo?: boolean) {
    return this.gruposService.findAll(ativo);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.gruposService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateGrupoDto) {
    return this.gruposService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.gruposService.remove(id);
  }

  @Patch(':id/desativar')
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.gruposService.deactivate(id);
  }

  @Post(':id/integrantes')
  addIntegrante(
    @Param('id', ParseIntPipe) grupoId: number,
    @Body() dto: AdicionarIntegranteGrupoDto,
  ) {
    return this.gruposService.addIntegrante(grupoId, dto);
  }

  @Patch(':id/integrantes/:integranteId')
  updateIntegrante(
    @Param('id', ParseIntPipe) grupoId: number,
    @Param('integranteId', ParseIntPipe) integranteId: number,
    @Body() dto: UpdateIntegranteGrupoDto,
  ) {
    return this.gruposService.updateIntegrante(grupoId, integranteId, dto);
  }

  @Delete(':id/integrantes/:integranteId')
  removeIntegrante(
    @Param('id', ParseIntPipe) grupoId: number,
    @Param('integranteId', ParseIntPipe) integranteId: number,
  ) {
    return this.gruposService.removeIntegrante(grupoId, integranteId);
  }

  @Post('importar-integrantes')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      fileFilter: (_req, file, callback) => {
        if (!ALLOWED_SHEET_MIMETYPES.includes(file.mimetype)) {
          return callback(
            new BadRequestException('Apenas arquivos .xlsx, .xls ou .csv são permitidos.'),
            false,
          );
        }
        callback(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  importarIntegrantes(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Arquivo não enviado.');
    }
    return this.gruposService.importarIntegrantes(file.buffer);
  }
}
