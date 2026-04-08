import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { BackupsService } from './backups.service';
import { RestoreBackupDto } from './dto/restore-backup.dto';
import { AuthTokenGuard } from 'src/auth/guard/auth-token-guard';
import { BackupAdminGuard } from './guards/backup-admin.guard';

@Controller('api/backups')
@UseGuards(AuthTokenGuard, BackupAdminGuard)
export class BackupsController {
  constructor(private readonly backupsService: BackupsService) {}

  @Get()
  listBackups() {
    return this.backupsService.listBackups();
  }

  @Get(':filename')
  async downloadBackup(
    @Param('filename') filename: string,
    @Res() response: Response,
  ) {
    const file = await this.backupsService.getBackupFileForDownload(filename);

    response.setHeader('Content-Disposition', `attachment; filename="${file.name}"`);
    response.setHeader('Content-Type', 'application/gzip');

    return response.download(file.path, file.name);
  }

  @Post('restore')
  restoreBackup(@Body() dto: RestoreBackupDto) {
    return this.backupsService.restoreBackup(dto.filename);
  }

  @Post('generate')
  generateBackup() {
    return this.backupsService.generateBackup();
  }
}
