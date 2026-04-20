import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsString,
} from 'class-validator';
import { RoomStatus } from 'src/generated/enums';

export class CreateRoomDto {
  @IsNotEmpty()
  @IsString()
  roomNumber!: string;

  @IsNotEmpty()
  @IsString()
  type!: string;

  @IsNotEmpty()
  floor!: number;

  @IsNotEmpty()
  @IsNumber()
  maxOccupancy!: number;

  @IsNotEmpty()
  @IsNumber()
  pricePerNight!: number;

  @IsString()
  description!: string;

  @IsNotEmpty()
  @IsEnum(RoomStatus)
  status!: RoomStatus;

  @IsString({ each: true })
  @IsArray()
  images!: string[];
}
