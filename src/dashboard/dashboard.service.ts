import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  subDays,
  format,
} from 'date-fns';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const dayStart = startOfDay(now);
    const dayEnd = endOfDay(now);

    const [
      monthlyRevenue,
      todayBookings,
      checkedInCount,
      totalRooms,
      newCustomers,
    ] = await Promise.all([
      this.prisma.payment.aggregate({
        where: {
          status: 'APPROVED',
          reviewedAt: { gte: monthStart, lte: monthEnd },
        },
        _sum: { amount: true },
      }),

      this.prisma.booking.count({
        where: { createdAt: { gte: dayStart, lte: dayEnd } },
      }),

      this.prisma.booking.count({
        where: { status: 'CHECKED_IN' },
      }),

      this.prisma.room.count({
        where: { status: 'AVAILABLE' },
      }),

      this.prisma.user.count({
        where: {
          role: 'USER',
          createdAt: { gte: monthStart, lte: monthEnd },
        },
      }),
    ]);

    const occupancyRate =
      totalRooms > 0 ? Math.round((checkedInCount / totalRooms) * 100) : 0;

    return {
      monthlyRevenue: Number(monthlyRevenue._sum.amount ?? 0),
      todayBookings,
      occupancyRate,
      newCustomers,
    };
  }

  async getRevenueChart() {
    const now = new Date();
    const rangeStart = startOfDay(subDays(now, 29));

    const payments = await this.prisma.payment.findMany({
      where: {
        status: 'APPROVED',
        reviewedAt: { gte: rangeStart },
      },
      select: { amount: true, reviewedAt: true },
    });

    // สร้าง map ครบทุก 30 วัน ป้องกันวันที่ไม่มีข้อมูลหายไป
    const dayMap = new Map<string, number>();
    for (let i = 29; i >= 0; i--) {
      const label = format(subDays(now, i), 'd MMM');
      dayMap.set(label, 0);
    }

    for (const p of payments) {
      if (!p.reviewedAt) continue;
      const label = format(p.reviewedAt, 'd MMM');
      if (dayMap.has(label)) {
        dayMap.set(label, dayMap.get(label)! + Number(p.amount));
      }
    }

    return {
      labels: Array.from(dayMap.keys()),
      data: Array.from(dayMap.values()),
    };
  }

  async getRoomTypeChart() {
    const COLORS: Record<string, string> = {
      Standard: '#6366f1',
      Deluxe: '#10b981',
      Suite: '#f59e0b',
      Family: '#94a3b8',
    };

    const bookings = await this.prisma.booking.findMany({
      where: { status: { notIn: ['CANCELLED'] } },
      select: { room: { select: { type: true } } },
    });

    const countMap = new Map<string, number>();
    for (const b of bookings) {
      const type = b.room.type;
      countMap.set(type, (countMap.get(type) ?? 0) + 1);
    }

    const total = bookings.length;

    return Array.from(countMap.entries()).map(([name, count]) => ({
      name,
      value: total > 0 ? Math.round((count / total) * 100) : 0,
      color: COLORS[name] ?? '#cbd5e1',
    }));
  }
}
