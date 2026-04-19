import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Controller('bookings')
export class BookingController {
  // @UseGuards(AuthGuard('jwt'))
  // @Get('me')
  // getMyBookings(@Req() req) {
  //   return {
  //     message: 'Protected route',
  //     user: req.user,
  //   };
  // }
}
