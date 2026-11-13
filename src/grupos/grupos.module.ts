import { Module } from '@nestjs/common';
import { GruposController } from './grupos.controller';
import { GruposService } from './grupos.service';
import { AuthModule } from '../auth/auth.module';
import { AdminRoleGuard } from '../auth/guard/admin-role.guard';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [GruposController],
  providers: [GruposService, AdminRoleGuard],
  exports: [GruposService],
})
export class GruposModule {}
