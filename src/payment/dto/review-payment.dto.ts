import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export enum ReviewAction {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
}

export class ReviewPaymentDto {
  @IsEnum(ReviewAction)
  action!: ReviewAction;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string; // ใส่เหตุผลตอน reject
}
