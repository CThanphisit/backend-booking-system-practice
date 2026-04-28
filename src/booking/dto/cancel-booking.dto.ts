import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export enum CancelReason {
  CHANGE_PLAN = 'เปลี่ยนแผนการเดินทาง',
  EMERGENCY = 'เหตุฉุกเฉิน',
  WRONG_DATE = 'จองผิดวันที่',
  FOUND_OTHER = 'หาที่พักอื่นได้',
  OTHER = 'อื่นๆ',
}

export const THAI_BANKS = [
  'กสิกรไทย',
  'กรุงไทย',
  'กรุงเทพ',
  'กรุงศรีอยุธยา',
  'ไทยพาณิชย์',
  'ทหารไทยธนชาต',
  'ออมสิน',
  'เพื่อการเกษตรและสหกรณ์การเกษตร',
] as const;

export type ThaiBank = (typeof THAI_BANKS)[number];

export class CancelBookingDto {
  // ── เหตุผลการยกเลิก ─────────────────────────────────────────────────────
  @IsEnum(CancelReason, { message: 'กรุณาเลือกเหตุผลการยกเลิก' })
  reason!: CancelReason;

  // ── ข้อมูลบัญชีรับเงินคืน ────────────────────────────────────────────────
  // บังคับกรอกเฉพาะเมื่อมีการโอนเงินมาแล้ว (WAITING_REVIEW หรือ APPROVED)
  // Frontend ต้องส่งมาถ้ามี payment และ status เป็น 2 สถานะนั้น

  @IsOptional()
  @IsString()
  @MaxLength(50)
  bankName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'เลขบัญชีต้องไม่เกิน 20 ตัวอักษร' })
  bankAccount?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  bankAccountName?: string;
}
