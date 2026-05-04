import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { Auth } from '@/common/decorators/auth.decorator';
import { Role } from '@/generated/enums';
import type { User } from '@/generated/client';
import { GetUser } from '@/common/decorators/get-user.decorator';
import { AuthGuard } from '@nestjs/passport';
import { ReviewPaymentDto } from './dto/review-payment.dto';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

const slipStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'bookify/slips',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ quality: 'auto', fetch_format: 'auto' }],
  } as any,
});

const imageFileFilter = (
  req: any,
  file: Express.Multer.File,
  cb: (error: Error | null, acceptFile: boolean) => void,
) => {
  if (!file.mimetype.startsWith('image/')) {
    return cb(new BadRequestException('รับเฉพาะไฟล์รูปภาพเท่านั้น'), false);
  }
  cb(null, true);
};

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('upload-slip')
  @UseGuards(AuthGuard('jwt'))
  // ── User: upload slip
  // @Post('upload-slip')
  @UseInterceptors(
    FileInterceptor('slip', {
      storage: slipStorage,
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
      fileFilter: imageFileFilter,
    }),
  )
  async uploadSlip(
    @UploadedFile() file: Express.Multer.File,
    @Body('bookingId') bookingId: string,
    @GetUser() user: User,
  ) {
    if (!file) throw new BadRequestException('กรุณาแนบรูปสลิป');
    return this.paymentService.uploadSlip(bookingId, file.path, user);
  }

  // ── User: ดูสถานะ payment ของ booking
  @Get('booking/:bookingId')
  getMyPayment(@Param('bookingId') bookingId: string, @GetUser() user: User) {
    return this.paymentService.getMyPayment(bookingId, user);
  }

  // ── Admin: ดูรายการ payment ทั้งหมด
  @Get('admin/all')
  @UseGuards(AuthGuard('jwt'))
  @Auth(Role.ADMIN)
  getAllPayments(@Query('status') status?: string) {
    return this.paymentService.getAllPayments(status);
  }

  // ── Admin: ดู payment รายละเอียด
  @Get('admin/:id')
  @UseGuards(AuthGuard('jwt'))
  @Auth(Role.ADMIN)
  getPaymentById(@Param('id') paymentId: string) {
    return this.paymentService.getPaymentById(paymentId);
  }

  // ── Admin: อนุมัติหรือปฏิเสธ
  @Patch('admin/:id/review')
  @UseGuards(AuthGuard('jwt'))
  @Auth(Role.ADMIN)
  reviewPayment(
    @Param('id') paymentId: string,
    @Body() dto: ReviewPaymentDto,
    @GetUser() user: User,
  ) {
    return this.paymentService.reviewPayment(
      paymentId,
      dto.action,
      user.id,
      dto.note,
    );
  }

  @Patch('admin/:id/refund')
  @UseGuards(AuthGuard('jwt'))
  @Auth(Role.ADMIN)
  confirmRefund(
    @Param('id') paymentId: string,
    @Body('note') note: string,
    @GetUser() user: User,
  ) {
    return this.paymentService.confirmRefund(paymentId, user.id, note);
  }
}
