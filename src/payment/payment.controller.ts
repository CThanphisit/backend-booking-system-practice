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
import { diskStorage } from 'multer';
import { Auth } from '@/common/decorators/auth.decorator';
import { Role } from '@/generated/enums';
import type { User } from '@/generated/client';
import { GetUser } from '@/common/decorators/get-user.decorator';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { ReviewPaymentDto } from './dto/review-payment.dto';
import { extname } from 'path';

// ─── Multer config ────────────────────────────────────────────────────────────
const slipStorage = diskStorage({
  destination: './uploads/slips',
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = extname(file.originalname);
    cb(null, `slip-${unique}${ext}`);
  },
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
  // ── User: upload slip ──────────────────────────────────────────────────────
  @Post('upload-slip')
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
    const slipUrl = `/uploads/slips/${file.filename}`;
    return this.paymentService.uploadSlip(bookingId, slipUrl, user);
  }

  // ── User: ดูสถานะ payment ของ booking ────────────────────────────────────
  @Get('booking/:bookingId')
  getMyPayment(@Param('bookingId') bookingId: string, @GetUser() user: User) {
    return this.paymentService.getMyPayment(bookingId, user);
  }

  // ── Admin: ดูรายการ payment ทั้งหมด ──────────────────────────────────────
  @Get('admin/all')
  @UseGuards(RolesGuard)
  @Auth(Role.ADMIN)
  getAllPayments(@Query('status') status?: string) {
    return this.paymentService.getAllPayments(status);
  }

  // ── Admin: ดู payment รายละเอียด ─────────────────────────────────────────
  @Get('admin/:paymentId')
  @UseGuards(RolesGuard)
  @Auth(Role.ADMIN)
  getPaymentById(@Param('paymentId') paymentId: string) {
    return this.paymentService.getPaymentById(paymentId);
  }

  // ── Admin: อนุมัติหรือปฏิเสธ ─────────────────────────────────────────────
  @Patch('admin/:paymentId/review')
  @UseGuards(RolesGuard)
  @Auth(Role.ADMIN)
  reviewPayment(
    @Param('paymentId') paymentId: string,
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
}
