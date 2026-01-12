import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { HashingServiceProtocol } from 'src/auth/hash/hashing.service';
import {PayloadTokenDto} from "src/auth/dto/payload-token.dto";

import * as path from 'node:path';
import * as fs from 'node:fs/promises';

@Injectable()
export class UsersService {

constructor(
  private prisma:PrismaService,
  private readonly hashingService: HashingServiceProtocol
) {}

async findAll() {
    const users = await this.prisma.user.findMany({
        select:{
          id:true,
          name:true,
          email:true,
          role:true,
          imagem:true,  
        }
      });

    return users;
}

async findOne(id: number) {
    const user = await this.prisma.user.findFirst({
        where: {
            id:id,
        },
        select:{
            id:true,
            name:true,
            email:true,
            imagem:true, 
            role:true,
            Tasks:true   
        }
    });

    if(user) return user;

    throw new HttpException('User not found', HttpStatus.NOT_FOUND);
  }


async create(createUserDto:CreateUserDto, file?: Express.Multer.File){
  try{
    const passwordHash = await this.hashingService.hash(createUserDto.password)

    let imageName: string | null = null

    if(file){
      const ext = path.extname(file.originalname)
      imageName = `${Date.now()}${ext}`

      const filePath = path.resolve(process.cwd(), 'files', imageName)
      await fs.mkdir(path.dirname(filePath), { recursive: true })
      await fs.writeFile(filePath, file.buffer)
    }

    const user =  await this.prisma.user.create({
        data:{
           name: createUserDto.name,
           email: createUserDto.email,
           password: passwordHash,
           role: createUserDto.role ?? 'Admin',
           imagem: imageName,     
        },
        select:{
            id:true,
            name:true,
            email:true,
            imagem:true,
            role:true,
        }
    });

    return user;
  }catch(error){
    if (error.code === 'P2002') {
      throw new HttpException('Email já cadastrado', HttpStatus.CONFLICT)
    }

    throw new HttpException(
      'Error creating user', 
      HttpStatus.BAD_REQUEST
    );
  }
}

async update(
  id: number,
  dto: UpdateUserDto,
  file: Express.Multer.File | undefined,
  tokenPayload: PayloadTokenDto,
) {
  const user = await this.prisma.user.findFirst({
    where: { id },
  })

  if (!user) {
    throw new HttpException('User not found', HttpStatus.NOT_FOUND)
  }

  if (user.id !== tokenPayload.sub) {
    throw new HttpException('Acesso negado', HttpStatus.FORBIDDEN)
  }

  let imageName: string | undefined

  if (file) {
    const ext = path.extname(file.originalname)
    imageName = `${tokenPayload.sub}${ext}`

    const filePath = path.resolve(process.cwd(), 'files', imageName)
    await fs.mkdir(path.dirname(filePath), { recursive: true })
    await fs.writeFile(filePath, file.buffer)
  }

  let passwordHash: string | undefined

  if (dto.password) {
    passwordHash = await this.hashingService.hash(dto.password)
  }

  return this.prisma.user.update({
    where: { id },
    data: {
      ...(dto.name && { name: dto.name }),
      ...(passwordHash && { password: passwordHash }),
      ...(dto.role && { role: dto.role }),
      ...(imageName && { imagem: imageName }),
    },
    select: {
      id: true,
      name: true,
      email: true,
      imagem: true,
      role: true,
    },
  })
}



async delete(id:number, tokenPayload:PayloadTokenDto){
try{

  const user = await this.prisma.user.findFirst({
    where: {
        id:id,
    },     
  });

  if(!user){
    throw new HttpException('Usuario nao existe', HttpStatus.BAD_REQUEST);
  }

     if(user.id !== tokenPayload.sub){
        throw new HttpException('Acesso negado', HttpStatus.FORBIDDEN);
    }

  await this.prisma.user.delete({
    where:{
        id:id
    }
  });

  return {message: 'User deleted successfully'};

}catch(err){
    throw new HttpException('Error deleting user', HttpStatus.BAD_REQUEST); 
}    
}

async uploadAvatarImage(
    tokenPayload: PayloadTokenDto, 
    file:Express.Multer.File){

    try{ 
      
      const fileExtension = path.extname(file.originalname).toLowerCase().substring(1)
      const fileName = `${tokenPayload.sub}.${fileExtension}`
      const fileLocale = path.resolve(process.cwd(), 'files', fileName)
      
      await fs.mkdir(path.dirname(fileLocale), { recursive: true })
      await fs.writeFile(fileLocale, file.buffer)
      const user = await this.prisma.user.findFirst({
        where:{
            id:tokenPayload.sub
        }
      })

       if(!user){
        throw new HttpException('Falha ao atualizar imagem do usuario', HttpStatus.BAD_REQUEST);
       }

       const updateUser = await this.prisma.user.update({
        where:{
            id:tokenPayload.sub
        },
        data:{
            imagem:fileName
        },
        select:{
            id:true,
            email:true,
            imagem:true,
            name:true
        }
       })

      return updateUser;

    }catch(err){
         throw new HttpException('Falha ao atualizar imagem do usuario', HttpStatus.BAD_REQUEST);
    }     


}

}
