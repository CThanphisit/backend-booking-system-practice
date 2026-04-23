import { IsString, IsUUID } from 'class-validator';

export class UploadSlipDto {
  @IsString()
  @IsUUID()
  bookingId!: string;
}
