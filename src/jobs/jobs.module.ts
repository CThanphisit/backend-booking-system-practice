import { PrismaModule } from '@/prisma/prisma.module';
import { Module } from '@nestjs/common';
import { BookingExpiryJob } from './booking-expiry.job';

@Module({
  imports: [PrismaModule],
  providers: [BookingExpiryJob],
})
export class JobsModule {}
