import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { AuthTokenGuard } from '../auth/guard/auth-token-guard'
import { AdminRoleGuard } from '../auth/guard/admin-role.guard'
import { AnalyticsService } from './analytics.service'
import { PeriodoDto } from './dto/periodo.dto'

@ApiTags('Analytics')
@ApiBearerAuth('access-token')
@UseGuards(AuthTokenGuard, AdminRoleGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('status')
  @ApiOperation({ summary: 'Indica se a integração com o Google Analytics está configurada no servidor' })
  status() {
    return this.analyticsService.status()
  }

  @Get('audiencia')
  @ApiOperation({ summary: 'Métricas de audiência do blog (GA4) no período, comparadas ao período anterior' })
  audiencia(@Query() periodo: PeriodoDto) {
    return this.analyticsService.audiencia(periodo.inicio, periodo.fim)
  }

  @Get('tempo-real')
  @ApiOperation({ summary: 'Pessoas no blog nos últimos 30 minutos' })
  tempoReal() {
    return this.analyticsService.tempoReal()
  }
}
