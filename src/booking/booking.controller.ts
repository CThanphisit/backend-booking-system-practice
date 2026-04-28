import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
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
  findAll(@GetUser() user: User) {
    return this.bookingService.findAll(user);
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
