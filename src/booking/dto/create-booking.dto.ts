import { BookingStatus } from '@/generated/enums';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsString,
} from 'class-validator';

export class CreateBookingDto {
  @IsNotEmpty()
  @IsString()
  userId!: string;

  @IsNotEmpty()
  @IsString()
  roomId!: string;

  @IsNotEmpty()
  @IsDate()
  @Type(() => Date)
  checkInDate!: Date;

  @IsNotEmpty()
  @IsDate()
  @Type(() => Date)
  checkOutDate!: Date;

  @IsNotEmpty()
  @IsNumber()
  nights!: number;

  @IsNotEmpty()
  @IsNumber()
  guestCount!: number;

  // @IsNotEmpty()
  // @IsNumber()
  // totalAmount!: number;

  //   @IsNotEmpty()
  @IsEnum(BookingStatus)
  status!: BookingStatus;

  @IsString()
  note?: string;
}
