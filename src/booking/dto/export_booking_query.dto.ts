import { BookingStatus, PaymentStatus } from '@/generated/client';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsOptional } from 'class-validator';

/**
 * Query params สำหรับ GET /booking/export/csv
 *
 * ทุก field เป็น optional — ไม่ส่งอะไรมาเลย = export ทั้งหมด
 * ส่งมาบางส่วน = filter เฉพาะที่ระบุ
 *
 * ตัวอย่าง URL:
 *   /booking/export/csv
 *   /booking/export/csv?bookingStatus=CONFIRMED
 *   /booking/export/csv?startDate=2025-01-01&endDate=2025-12-31
 *   /booking/export/csv?startDate=2025-01-01&bookingStatus=COMPLETED&paymentStatus=APPROVED
 */
export class ExportBookingQueryDto {
  /**
   * กรอง checkInDate >= startDate
   * รับเป็น ISO string เช่น "2025-01-01" แล้ว transform เป็น Date อัตโนมัติ
   */
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  /**
   * กรอง checkInDate <= endDate
   */
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;

  /**
   * กรองสถานะ booking: PENDING | CONFIRMED | CHECKED_IN | COMPLETED | CANCELLED
   */
  @IsOptional()
  @IsEnum(BookingStatus)
  bookingStatus?: BookingStatus;

  /**
   * กรองสถานะการชำระเงิน: WAITING_REVIEW | APPROVED | REJECTED | REFUND_PENDING | REFUNDED
   * หมายเหตุ: booking ที่ยังไม่มี payment record จะถูกตัดออกเมื่อใช้ filter นี้
   */
  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;
}
