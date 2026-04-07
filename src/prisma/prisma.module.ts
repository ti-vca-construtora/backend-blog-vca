<<<<<<< HEAD
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
=======
import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Module({
  providers: [PrismaService],
  exports:[PrismaService]
>>>>>>> c6ded7540776d2011921a19c4d062448741fb538
})
export class PrismaModule {}
