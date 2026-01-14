import { Module } from '@nestjs/common';
import { BannersService } from './banners.service';
import { BannersController } from './banners.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { UploadModule } from 'src/common/upload/upload.module';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports:[UploadModule, PrismaModule],
  providers: [BannersService, PrismaService],
  controllers: [BannersController]
})
export class BannersModule {}
