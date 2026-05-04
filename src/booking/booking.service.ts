import { PrismaService } from '@/prisma/prisma.service';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateBookingDto } from './dto/create-booking.dto';
import { differenceInDays } from 'date-fns';
import { customAlphabet } from 'nanoid';
import { Decimal } from '@prisma/client/runtime/client';
import { BookingStatus, Prisma, User } from '@/generated/client';
import { CancelBookingDto } from './dto/cancel-booking.dto';

// interface UserType {
//   userId: string;
//   email: string;
//   role: string;
//   first_name: string;
//   last_name: string;
//   phoneNumber: string;
// }

@Injectable()
export class BookingService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly generateBookingCode = customAlphabet(
    '123456789ABCDEFGHJKLMNPQRSTUVWXYZ',
    6,
  );

  private calculateRefund(amount: number, checkInDate: Date): number {
    const hoursLeft = (checkInDate.getTime() - Date.now()) / 3600000;
    if (hoursLeft >= 48) return amount;
    if (hoursLeft >= 0) return amount * 0.5;
    return 0;
  }

  async create(createBookingDto: CreateBookingDto, user: User) {
    //เช็คห้องว่าว่างมั้ย
    return await this.prisma.$transaction(
      async (tx) => {
        // เช็คว่าห้องมีอยู่จริงมั้ย
        const existingRoom = await tx.room.findUnique({
          where: { id: createBookingDto.roomId },
        });

        if (!existingRoom) {
          throw new NotFoundException('Room not found');
        } else if (existingRoom.status !== 'AVAILABLE') {
          throw new ConflictException('Room is not available');
        }

        // เช็คห้องว่าง
        const conflict = await tx.booking.findFirst({
          where: {
            roomId: createBookingDto.roomId,
            status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] },
            AND: [
              { checkInDate: { lt: createBookingDto.checkOutDate } },
              { checkOutDate: { gt: createBookingDto.checkInDate } },
            ],
          },
        });

        if (conflict)
          throw new ConflictException('ห้องไม่ว่างในช่วงวันดังกล่าว');

        // คำนวนวันที่เข้าพัก
        const nights = differenceInDays(
          createBookingDto.checkOutDate,
          createBookingDto.checkInDate,
        );

        if (nights < 1) throw new BadRequestException('จํานวนวันไม่ถูกต้อง');

        // ตรวจจำนวนคนเข้าพัก
        if (createBookingDto.guestCount > existingRoom.maxOccupancy) {
          throw new BadRequestException(
            `ห้องนี้รองรับผู้เข้าพักสูงสุด ${existingRoom.maxOccupancy} คน`,
          );
        }

        // คํานวณราคา
        const totalAmount = Decimal(nights).mul(existingRoom.pricePerNight);

        // gen booking code
        const bookingCode = `BK-${this.generateBookingCode()}`;

        // create booking
        return await tx.booking.create({
          data: {
            // ...createBookingDto,
            userId: user.id,
            roomId: createBookingDto.roomId,
            checkInDate: createBookingDto.checkInDate,
            checkOutDate: createBookingDto.checkOutDate,
            nights,
            guestCount: createBookingDto.guestCount,
            totalAmount,
            status: 'PENDING',
            code: bookingCode,
            paymentDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
            // paymentDeadline: new Date(Date.now() + 1 * 60 * 1000), // 1 นาที
          },
          include: {
            room: {
              select: {
                roomNumber: true,
                type: true,
                floor: true,
              },
            },
            user: {
              select: {
                first_name: true,
                last_name: true,
                email: true,
              },
            },
          },
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  }

  async findAll(user: User) {
    let whereCondition = {};

    // ถ้าไม่ใช่ Admin ให้ดึงเฉพาะ Booking ที่ตัวเองเป็นเจ้าของ
    if (user.role !== 'ADMIN') {
      whereCondition = {
        userId: user.id,
      };
    }

    return await this.prisma.booking.findMany({
      where: whereCondition,
      include: {
        room: true,
        payment: true,
        user: {
          select: {
            id: true,
            email: true,
            first_name: true,
            last_name: true,
            phoneNumber: true,
            role: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  async findOne(id: string, userId: string) {
    const checkOwner = await this.prisma.booking.findFirst({
      where: {
        id: id,
        OR: [{ userId: userId }, { user: { role: 'ADMIN' } }],
      },
      include: {
        room: true,
        payment: true,
      },
    });

    if (!checkOwner) {
      throw new NotFoundException('ไม่มีสิทธิ์เข้าถึง');
    }

    return checkOwner;
  }

  async updateBookingStatus(id: string, status: BookingStatus) {
    return await this.prisma.booking.update({
      where: {
        id: id,
      },
      data: {
        status: status,
      },
    });
  }

  // async cancelBookingByUser(id: string, user: User) {
  //   return await this.prisma.booking.update({
  //     where: {
  //       id: id,
  //       userId: user.id,
  //     },
  //     data: {
  //       status: 'CANCELLED',
  //     },
  //   });
  // }
  async cancelBooking(
    bookingId: string,
    userId: string,
    dto: CancelBookingDto,
  ) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { payment: true },
    });

    if (!booking) throw new NotFoundException('ไม่พบการจอง');
    if (booking.userId !== userId) throw new ForbiddenException();
    if (!['PENDING', 'CONFIRMED'].includes(booking.status)) {
      throw new BadRequestException('ไม่สามารถยกเลิกได้');
    }

    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: 'CANCELLED',
          cancellationReason: dto.reason,
          cancelledAt: now,
        },
      });

      // ไม่มี payment → จบเลย
      if (!booking.payment) return { message: 'ยกเลิกสำเร็จ' };

      const { status: paymentStatus } = booking.payment;

      // WAITING_REVIEW หรือ APPROVED → ต้องคืนเงิน
      if (['WAITING_REVIEW', 'APPROVED'].includes(paymentStatus)) {
        const refundAmount =
          paymentStatus === 'APPROVED'
            ? this.calculateRefund(
                Number(booking.payment.amount),
                booking.checkInDate,
              )
            : null; // WAITING_REVIEW ยังไม่รู้ว่าโอนจริงไหม admin ตัดสินใจเอง

        await tx.payment.update({
          where: { id: booking.payment.id },
          data: {
            status: 'REFUND_PENDING',
            refundAmount,
            refundNote: dto.reason,
            // ข้อมูลบัญชีรับเงินคืน
            refundBankName: dto.bankName,
            refundBankAccount: dto.bankAccount,
            refundBankAccountName: dto.bankAccountName,
          },
        });

        return {
          message: 'ยกเลิกแล้ว รอ admin ดำเนินการคืนเงิน',
          refundAmount,
        };
      }

      return { message: 'ยกเลิกสำเร็จ' };
    });
  }
}
