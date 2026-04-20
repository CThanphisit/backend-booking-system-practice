import { ConflictException, Injectable } from '@nestjs/common';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class RoomService {
  constructor(private readonly prisma: PrismaService) {}
  async create(createRoomDto: CreateRoomDto) {
    console.log('createRoomDto', createRoomDto);
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

  async findAll() {
    const allRooms = await this.prisma.room.findMany();

    return allRooms;
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
