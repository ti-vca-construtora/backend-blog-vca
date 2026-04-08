import { Module } from '@nestjs/common';
import { BackupsController } from './backups.controller';
import { BackupsService } from './backups.service';
import { BackupAdminGuard } from './guards/backup-admin.guard';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [BackupsController],
  providers: [BackupsService, BackupAdminGuard],
  exports: [BackupsService],
})
export class BackupsModule {}
