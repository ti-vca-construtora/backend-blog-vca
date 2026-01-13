import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseFilePipeBuilder,
  ParseIntPipe,
  HttpStatus,
  Patch,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common'

import {
  ApiTags,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger'


import { FileInterceptor } from '@nestjs/platform-express'

import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

import {TokenPayloadParam} from 'src/auth/param/token-payload.param';
import {PayloadTokenDto} from "src/auth/dto/payload-token.dto";
import {randomUUID} from 'node:crypto';
import { AuthTokenGuard } from 'src/auth/guard/auth-token-guard';


@Controller('users')
export class UsersController {
    constructor(private readonly userService:UsersService) {}
    
    @Get()
    findAllUsers() {
      return this.userService.findAll();
   }    
   
   @Get(':id')
   findOneUser(@Param('id', ParseIntPipe) id: number) {
   return this.userService.findOne(id)
   }  
      

@Post()
@ApiConsumes('multipart/form-data')
@ApiBody({
  schema: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      email: { type: 'string' },
      password: { type: 'string' },
      role: { type: 'string' },
      file: {
        type: 'string',
        format: 'binary',
      },
    },
    required: ['name', 'email', 'password'],
  },
})
@UseInterceptors(FileInterceptor('file'))
   createUser(
    @Body() createUserDto:CreateUserDto,
    @UploadedFile() file?: Express.Multer.File
  ){
    return this.userService.create(createUserDto, file)  
   }
   
   @UseGuards(AuthTokenGuard)
@Patch(':id')
@ApiConsumes('multipart/form-data')
@ApiBody({
  description: 'Atualização do usuário (imagem opcional)',
  schema: {
    type: 'object',
    properties: {
      file: {
        type: 'string',
        format: 'binary',
        description: 'Nova imagem do usuário (opcional)',
      },
      name: { type: 'string' },
      password: { type: 'string' },
      role: { type: 'string', example: 'Admin' },
    },
  },
})
@UseInterceptors(FileInterceptor('file'))
updateUser(
  @Param('id', ParseIntPipe) id: number,

  @Body() updateUserDto: UpdateUserDto,

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
  return this.userService.update(id, updateUserDto, file, tokenPayload)
}

     
    @UseGuards(AuthTokenGuard)
    @Delete(':id')  
    deleteUser(@Param('id', ParseIntPipe) id:number,
               @TokenPayloadParam() tokenPayload: PayloadTokenDto
        ) {   
        return this.userService.delete(id, tokenPayload);
    }

@UseGuards(AuthTokenGuard)
@Delete(':id/imagem')
@ApiBearerAuth()
@ApiParam({
  name: 'id',
  type: Number,
  description: 'ID do usuário',
  example: 1,
})
removeImagem(
  @Param('id', ParseIntPipe) id: number,
  @TokenPayloadParam() tokenPayload: PayloadTokenDto,
) {
  return this.userService.removeImagem(id, tokenPayload)
}


    
@UseGuards(AuthTokenGuard)
@UseInterceptors(FileInterceptor('file'))
@Post('upload')
async uploadAvatar(
  @TokenPayloadParam() tokenPayload: PayloadTokenDto,

  @UploadedFile(
    new ParseFilePipeBuilder()
      .addFileTypeValidator({
        fileType: /jpeg|jpg|png/,
      })
      .addMaxSizeValidator({
        maxSize: 3 * 1024 * 1024, // 3MB
      })
      .build({
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      }),
  )
  file: Express.Multer.File,
) {
  return this.userService.uploadAvatarImage(tokenPayload, file)
}


}