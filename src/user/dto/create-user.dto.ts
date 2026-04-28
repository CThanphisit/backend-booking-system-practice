import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { Role } from 'src/generated/enums';

export class CreateUserDto {
  @IsEmail({}, { message: 'รูปแบบอีเมลไม่ถูกต้อง' })
  email!: string;

  @IsString()
  @IsNotEmpty({ message: 'กรุณากรอกชื่อ' })
  first_name!: string;

  @IsString()
  @IsNotEmpty({ message: 'กรุณากรอกนามสกุล' })
  last_name!: string;

  @IsString()
  @MinLength(8, { message: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร' })
  password!: string;

  @IsString()
  @IsNotEmpty({ message: 'กรุณากรอกเบอร์โทรศัพท์' })
  phoneNumber!: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
