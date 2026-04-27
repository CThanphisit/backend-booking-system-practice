import { PrismaService } from '@/prisma/prisma.service';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ReviewAction } from './dto/review-payment.dto';
import { User } from '@/generated/client';

@Injectable()
export class PaymentService {
  constructor(private readonly prisma: PrismaService) {}

  // upload slip
  async uploadSlip(bookingId: string, slipUrl: string, user: User) {
    // 1. หา booking และเช็คว่าเป็นของ user คนนี้
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { payment: true },
    });

    if (!booking) {
      throw new NotFoundException('ไม่พบการจอง');
    }

    if (booking.userId !== user.id) {
      throw new ForbiddenException('ไม่มีสิทธิ์เข้าถึงการจองนี้');
    }

    // 2. booking ต้องเป็น PENDING เท่านั้น
    if (booking.status !== 'PENDING') {
      throw new BadRequestException(
        'ไม่สามารถ upload สลิปได้ เนื่องจากสถานะการจองไม่ใช่ PENDING',
      );
    }

    // 3. ถ้ามี payment อยู่แล้วและยังรอตรวจ → ห้าม upload ซ้ำ
    if (booking.payment && booking.payment.status === 'WAITING_REVIEW') {
      throw new ConflictException(
        'อยู่ระหว่างรอ admin ตรวจสอบ ไม่สามารถ upload ใหม่ได้',
      );
    }

    // 4. ถ้าเคย APPROVED แล้ว → ห้าม upload
    if (booking.payment && booking.payment.status === 'APPROVED') {
      throw new ConflictException('การชำระเงินได้รับการอนุมัติแล้ว');
    }

    // 5. upsert — สร้างใหม่ หรืออัปเดตถ้าเคย REJECTED
    const payment = await this.prisma.payment.upsert({
      where: { bookingId },
      create: {
        bookingId,
        amount: booking.totalAmount,
        slipUrl,
        status: 'WAITING_REVIEW',
      },
      update: {
        slipUrl,
        status: 'WAITING_REVIEW',
        note: null, // ล้าง reject note เก่า
        reviewedBy: null,
        reviewedAt: null,
      },
    });

    return {
      message: 'อัปโหลดสลิปสำเร็จ กรุณารอ admin ตรวจสอบ',
      paymentId: payment.id,
      status: payment.status,
    };
  }

  // ─── User: ดูสถานะ payment ของ booking ตัวเอง ──────────────────────────
  async getMyPayment(bookingId: string, user: User) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        payment: true,
        room: { select: { roomNumber: true, type: true } },
      },
    });

    if (!booking) throw new NotFoundException('ไม่พบการจอง');

    if (booking.userId !== user.id) {
      throw new ForbiddenException('ไม่มีสิทธิ์เข้าถึงการจองนี้');
    }

    return {
      bookingId: booking.id,
      bookingCode: booking.code,
      bookingStatus: booking.status,
      room: booking.room,
      totalAmount: booking.totalAmount,
      payment: booking.payment ?? null,
    };
  }

  // ─── Admin: ดูรายการ payment ทั้งหมด + filter ─────────────────────────
  async getAllPayments(status?: string) {
    const whereCondition = status ? { status: status as any } : {};

    return this.prisma.payment.findMany({
      where: whereCondition,
      include: {
        booking: {
          include: {
            user: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                email: true,
                phoneNumber: true,
              },
            },
            room: {
              select: {
                roomNumber: true,
                type: true,
                floor: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' }, // เรียงเก่าสุดก่อน — รอนานสุดควรตรวจก่อน
    });
  }

  // ─── Admin: อนุมัติหรือปฏิเสธ ─────────────────────────────────────────
  async reviewPayment(
    paymentId: string,
    action: ReviewAction,
    adminId: string,
    note?: string,
  ) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) throw new NotFoundException('ไม่พบรายการชำระเงิน');

    // ตรวจได้เฉพาะที่ยังรอตรวจ
    if (payment.status !== 'WAITING_REVIEW') {
      throw new BadRequestException(
        `รายการนี้ถูกตรวจสอบแล้ว (${payment.status})`,
      );
    }

    // อนุมัติ
    if (action === ReviewAction.APPROVE) {
      const [updatedPayment] = await this.prisma.$transaction([
        this.prisma.payment.update({
          where: { id: paymentId },
          data: {
            status: 'APPROVED',
            reviewedBy: adminId,
            reviewedAt: new Date(),
            note: null,
          },
        }),
        // เปลี่ยน booking เป็น CONFIRMED พร้อมกัน
        this.prisma.booking.update({
          where: { id: payment.bookingId },
          data: { status: 'CONFIRMED' },
        }),
      ]);

      return {
        message: 'อนุมัติการชำระเงินสำเร็จ',
        payment: updatedPayment,
      };
    }

    // ปฏิเสธ
    if (action === ReviewAction.REJECT) {
      if (!note) {
        throw new BadRequestException('กรุณาระบุเหตุผลการปฏิเสธ');
      }

      const updatedPayment = await this.prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: 'REJECTED',
          note,
          reviewedBy: adminId,
          reviewedAt: new Date(),
        },
      });

      // Booking ยัง PENDING — user สามารถ upload ใหม่ได้

      return {
        message: 'ปฏิเสธการชำระเงินแล้ว',
        payment: updatedPayment,
      };
    }
  }

  // ─── Admin: ดู payment รายละเอียด ─────────────────────────────────────
  async getPaymentById(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        booking: {
          include: {
            user: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                email: true,
                phoneNumber: true,
              },
            },
            room: true,
          },
        },
      },
    });

    if (!payment) throw new NotFoundException('ไม่พบรายการชำระเงิน');
    return payment;
  }

  // ให้ User ส่งใบเสร็จใหม่ กรณี Admin REJECT
  // async reSubmitPayment(paymentId: string, newSlipUrl: string, user: User) {
  //   const uploadedSlip = await this.uploadSlip(paymentId, newSlipUrl, user);

  //   if (!uploadedSlip) {
  //     throw new BadRequestException('ไม่สามารถอัพโหลดใบเสร็จใหม่ได้');
  //   }

  //   return
  // }
}
