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

import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiTags,
} from '@nestjs/swagger'

import { FileInterceptor } from '@nestjs/platform-express'

import { BannersService } from './banners.service'
import { CreateBannerDto } from './dto/create-banner.dto'
import { UpdateBannerDto } from './dto/update-banner.dto'

import { AuthTokenGuard } from 'src/auth/guard/auth-token-guard'
import { TokenPayloadParam } from 'src/auth/param/token-payload.param'
import { PayloadTokenDto } from 'src/auth/dto/payload-token.dto'

@ApiTags('Banners')
@ApiBearerAuth('access-token')
@Controller('banners')
export class BannersController {
  constructor(private readonly bannersService: BannersService) {}

  @Get()
  findAll() {
    return this.bannersService.findAll()
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.bannersService.findOne(id)
  }

  @UseGuards(AuthTokenGuard)
  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Cadastro de banner',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        data_inicio: {
          type: 'string',
          example: '2025-01-01',
        },
        data_termino: {
          type: 'string',
          example: '2025-01-31',
        },
        status: {
          type: 'boolean',
          example: true,
        },
      },
      required: ['file', 'data_inicio'],
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  create(
    @Body() createBannerDto: CreateBannerDto,

    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({ fileType: /jpeg|jpg|png/ })
        .addMaxSizeValidator({ maxSize: 3 * 1024 * 1024 }) // 3MB
        .build({
          fileIsRequired:true,
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        }),
    )
    file: Express.Multer.File,

    @TokenPayloadParam() tokenPayload: PayloadTokenDto,
  ) {
    return this.bannersService.create(createBannerDto, file, tokenPayload)
  }

  @UseGuards(AuthTokenGuard)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateBannerDto: UpdateBannerDto,
    @TokenPayloadParam() tokenPayload: PayloadTokenDto,
  ) {
    return this.bannersService.update(id, updateBannerDto, tokenPayload)
  }

  @UseGuards(AuthTokenGuard)
  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @TokenPayloadParam() tokenPayload: PayloadTokenDto,
  ) {
    return this.bannersService.delete(id, tokenPayload)
  }
}
