import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { Role } from 'src/generated/enums';

export class UpdateUserDto {
  @IsOptional()
  @IsEmail({}, { message: 'รูปแบบอีเมลไม่ถูกต้อง' })
  email?: string;

  @IsOptional()
  @IsString()
  first_name?: string;

  @IsOptional()
  @IsString()
  last_name?: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  // ถ้าไม่ส่งมา → ไม่เปลี่ยน password
  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร' })
  password?: string;
}
