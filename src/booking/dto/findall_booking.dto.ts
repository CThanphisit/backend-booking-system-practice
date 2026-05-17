import { Type } from 'class-transformer';
import { IsInt, IsOptional } from 'class-validator';

export class FindAllBookingQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit?: number;
}
