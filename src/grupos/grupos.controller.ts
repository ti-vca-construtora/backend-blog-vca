import {
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
} from '@nestjs/common';
import { GruposService } from './grupos.service';
import { CreateGrupoDto } from './dto/create-grupo.dto';
import { UpdateGrupoDto } from './dto/update-grupo.dto';
import { AdicionarUsuarioGrupoDto } from './dto/adicionar-usuario-grupo.dto';

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

  @Patch(':id/desativar')
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.gruposService.deactivate(id);
  }

  @Post(':id/usuarios')
  addUser(
    @Param('id', ParseIntPipe) grupoId: number,
    @Body() dto: AdicionarUsuarioGrupoDto,
  ) {
    return this.gruposService.addUser(grupoId, dto.userId);
  }

  @Delete(':id/usuarios/:userId')
  removeUser(
    @Param('id', ParseIntPipe) grupoId: number,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.gruposService.removeUser(grupoId, userId);
  }
}
