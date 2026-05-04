import { ConflictException, Injectable } from '@nestjs/common';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { format } from 'date-fns';

@Injectable()
export class RoomService {
  constructor(private readonly prisma: PrismaService) {}
  async create(createRoomDto: CreateRoomDto) {
    const existingRoom = await this.prisma.room.findUnique({
      where: { roomNumber: createRoomDto.roomNumber },
    });

    if (existingRoom) {
      // ใช้ ConflictException (409) แทน Error ปกติ
      throw new ConflictException(
        `Room number ${createRoomDto.roomNumber} already exists`,
      );
    }

    // ทำการสร้าง Room ต่อ...
    return this.prisma.room.create({
      data: createRoomDto,
    });
  }

  async getList(params?: {
    checkIn?: string;
    checkOut?: string;
    guests?: number;
  }) {
    // ถ้าไม่ได้ส่งวันที่มา → return ทั้งหมด
    if (!params?.checkIn || !params?.checkOut) {
      return this.prisma.room.findMany({
        where: { status: 'AVAILABLE' },
        orderBy: { createdAt: 'desc' },
      });
    }

    const checkInDate = new Date(params.checkIn + 'T00:00:00');
    const checkOutDate = new Date(params.checkOut + 'T00:00:00');

    // หา roomId ที่มีการจองซ้อนกับช่วงวันที่เลือก
    const bookedRooms = await this.prisma.booking.findMany({
      where: {
        status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] },
        AND: [
          { checkInDate: { lt: checkOutDate } },
          { checkOutDate: { gt: checkInDate } },
        ],
      },
      select: { roomId: true },
    });

    const bookedRoomIds = bookedRooms.map((b) => b.roomId);

    return this.prisma.room.findMany({
      where: {
        status: 'AVAILABLE',
        id: { notIn: bookedRoomIds }, // ไม่เอาห้องที่ถูกจอง
        ...(params.guests && {
          maxOccupancy: { gte: params.guests }, // รองรับจำนวนคนพอ
        }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  getListAdmin() {
    return this.prisma.room.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async getBookedDates(roomId: string): Promise<string[]> {
    const bookings = await this.prisma.booking.findMany({
      where: {
        roomId,
        status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] },
      },
      select: { checkInDate: true, checkOutDate: true },
    });

    // แตก range ออกเป็นทุกวัน
    const dates = new Set<string>();
    for (const booking of bookings) {
      const current = new Date(booking.checkInDate);
      const end = new Date(booking.checkOutDate);
      while (current < end) {
        dates.add(format(current, 'yyyy-MM-dd'));
        current.setDate(current.getDate() + 1);
      }
    }

    return [...dates];
  }

  findOne(id: string) {
    return this.prisma.room.findUnique({ where: { id } });
  }

  update(id: string, updateRoomDto: UpdateRoomDto) {
    const room = this.prisma.room.update({
      where: { id },
      data: updateRoomDto,
    });

    return room;
  }

  remove(id: string) {
    return this.prisma.room.delete({ where: { id } });
  }
}
