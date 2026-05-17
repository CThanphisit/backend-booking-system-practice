import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { Role } from '@/generated/enums';
import { Auth } from '@/common/decorators/auth.decorator';
import { GetUser } from '@/common/decorators/get-user.decorator';
import type { BookingStatus, User } from '@/generated/client';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { FindAllBookingQueryDto } from './dto/findall_booking.dto';
import { ExportBookingQueryDto } from './dto/export_booking_query.dto';
import { format as formatDate } from 'date-fns';
import { format as csvFormat } from 'fast-csv';
import type { Response } from 'express';

@Controller('booking')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  async create(
    @Body() createBookingDto: CreateBookingDto,
    @GetUser() user: User,
  ) {
    return this.bookingService.create(createBookingDto, user);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  findAll(@GetUser() user: User, @Query() query: FindAllBookingQueryDto) {
    return this.bookingService.findAll(user, query.limit);
  }

  /**
   * GET /booking/export/csv
   *
   * Export ข้อมูล booking เป็นไฟล์ .csv — เฉพาะ Admin เท่านั้น
   *
   * Query params (ทั้งหมด optional):
   *   startDate     เช่น 2025-01-01  → กรอง checkInDate >= startDate
   *   endDate       เช่น 2025-12-31  → กรอง checkInDate <= endDate
   *   bookingStatus เช่น CONFIRMED   → กรองสถานะ booking
   *   paymentStatus เช่น APPROVED    → กรองสถานะ payment
   *
   * Response:
   *   Content-Type: text/csv; charset=utf-8
   *   Content-Disposition: attachment; filename="bookings_YYYY-MM-DD.csv"
   *   Body: UTF-8 BOM + CSV rows (stream)
   *
   * หมายเหตุ: ใส่ UTF-8 BOM (?) ที่หัวไฟล์เพื่อให้ Excel เปิดได้ถูกต้อง
   */
  @Get('export/csv')
  @Auth(Role.ADMIN)
  async exportCsv(@Query() query: ExportBookingQueryDto, @Res() res: Response) {
    const rows = await this.bookingService.getBookingsForExport(query);

    const filename = `bookings_${formatDate(new Date(), 'yyyy-MM-dd')}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // UTF-8 BOM — ทำให้ Excel รู้ว่าไฟล์เป็น UTF-8 (ป้องกันภาษาไทยเพี้ยน)
    res.write('﻿');

    // สร้าง CSV stream โดย fast-csv จะอ่าน key ของ object แรกเป็น headers
    const csvStream = csvFormat({ headers: true });
    csvStream.pipe(res);

    rows.forEach((row) => csvStream.write(row));
    csvStream.end();
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  @Auth(Role.ADMIN, Role.USER)
  findOne(@Param('id') id: string, @GetUser() user: User) {
    return this.bookingService.findOne(id, user.id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'))
  @Auth(Role.ADMIN)
  updateBookingStatus(
    @Param('id') id: string,
    @Body('status') status: BookingStatus,
  ) {
    return this.bookingService.updateBookingStatus(id, status);
  }

  @Patch(':id/cancel')
  @UseGuards(AuthGuard('jwt'))
  cancelBooking(
    @Param('id') id: string,
    @Body() dto: CancelBookingDto,
    @GetUser() user: User,
  ) {
    return this.bookingService.cancelBooking(id, user.id, dto);
  }
}
