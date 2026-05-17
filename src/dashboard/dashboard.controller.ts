import { Controller, Get } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { Auth } from '@/common/decorators/auth.decorator';
import { Role } from '@/generated/enums';

@Controller('dashboard')
@Auth(Role.ADMIN)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  getStats() {
    return this.dashboardService.getStats();
  }

  @Get('revenue-chart')
  getRevenueChart() {
    return this.dashboardService.getRevenueChart();
  }

  @Get('room-type-chart')
  getRoomTypeChart() {
    return this.dashboardService.getRoomTypeChart();
  }
}
