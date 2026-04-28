import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class BookingExpiryJob {
  private readonly logger = new Logger(BookingExpiryJob.name);

  constructor(private readonly prisma: PrismaService) {}

  // ทำงานทุก 10 นาที
  //   @Cron(CronExpression.EVERY_10_MINUTES)
  @Cron(CronExpression.EVERY_10_MINUTES)
  async cancelExpiredBookings() {
    const now = new Date();

    // หา booking ที่:
    // 1. status = PENDING (ยังไม่จ่าย)
    // 2. paymentDeadline น้อยกว่าเวลาปัจจุบัน
    // 3. ยังไม่มี payment หรือ payment ไม่ใช่ WAITING_REVIEW/APPROVED
    const expired = await this.prisma.booking.findMany({
      where: {
        status: 'PENDING',
        paymentDeadline: { lt: now },
        OR: [
          { payment: null }, // ยังไม่ upload
          { payment: { status: 'REJECTED' } }, // upload แล้วแต่โดน reject
        ],
      },
      select: { id: true, code: true },
    });

    if (expired.length === 0) return;

    this.logger.log(`พบ ${expired.length} booking หมดเวลาชำระ`);

    // bulk update ทีเดียว
    await this.prisma.booking.updateMany({
      where: { id: { in: expired.map((b) => b.id) } },
      data: {
        status: 'CANCELLED',
        // cancellationReason: 'หมดเวลาชำระเงิน',
        // cancelledAt: now,
        note: 'ยกเลิกอัตโนมัติ: หมดเวลาชำระเงิน',
      },
    });

    this.logger.log(`ยกเลิก booking: ${expired.map((b) => b.code).join(', ')}`);

    // TODO: ส่ง email แจ้ง user แต่ละคน
  }
}
