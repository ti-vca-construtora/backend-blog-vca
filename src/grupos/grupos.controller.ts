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
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { extname } from 'path';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AuthTokenGuard } from '../auth/guard/auth-token-guard';
import { AdminRoleGuard } from '../auth/guard/admin-role.guard';
import { GruposService } from './grupos.service';
import { CreateGrupoDto } from './dto/create-grupo.dto';
import { UpdateGrupoDto } from './dto/update-grupo.dto';
import { AdicionarIntegranteGrupoDto } from './dto/adicionar-usuario-grupo.dto';
import { UpdateIntegranteGrupoDto } from './dto/update-integrante-grupo.dto';

const MIME_TYPES_BY_EXTENSION: Record<string, readonly string[]> = {
  '.xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  '.xls': ['application/vnd.ms-excel'],
  '.csv': ['text/csv', 'application/vnd.ms-excel'],
};

function hasExpectedSheetContent(file: Express.Multer.File): boolean {
  if (!file.buffer?.length) return false;

  const extension = extname(file.originalname).toLowerCase();
  if (extension === '.xlsx') {
    return file.buffer.subarray(0, 2).equals(Buffer.from([0x50, 0x4b]));
  }
  if (extension === '.xls') {
    return file.buffer
      .subarray(0, 8)
      .equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]));
  }
  if (extension === '.csv') {
    const isUtf16 =
      file.buffer.subarray(0, 2).equals(Buffer.from([0xff, 0xfe])) ||
      file.buffer.subarray(0, 2).equals(Buffer.from([0xfe, 0xff]));
    return isUtf16 || !file.buffer.includes(0);
  }
  return false;
}

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

  @Post(':id/importar-integrantes')
  @UseGuards(AuthTokenGuard, AdminRoleGuard)
  @ApiBearerAuth('access-token')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      fileFilter: (_req, file, callback) => {
        const extension = extname(file.originalname).toLowerCase();
        const allowedMimeTypes = MIME_TYPES_BY_EXTENSION[extension];
        if (!allowedMimeTypes?.includes(file.mimetype)) {
          return callback(
            new BadRequestException(
              'Apenas arquivos .xlsx, .xls ou .csv são permitidos.',
            ),
            false,
          );
        }
        callback(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  importarIntegrantes(
    @Param('id', ParseIntPipe) grupoId: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Arquivo não enviado.');
    }
    if (!hasExpectedSheetContent(file)) {
      throw new BadRequestException(
        'O conteúdo do arquivo não corresponde ao formato informado.',
      );
    }
    return this.gruposService.importarIntegrantes(grupoId, file.buffer);
  }
}
