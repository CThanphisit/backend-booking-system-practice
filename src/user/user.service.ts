import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from './dto/register.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateUserDto } from './dto/create-user.dto';

const SELECT_USER = {
  id: true,
  email: true,
  first_name: true,
  last_name: true,
  phoneNumber: true,
  role: true,
  createdAt: true,
  updatedAt: true,
};
@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(resgisterDto: RegisterDto) {
    console.log('resgisterDto', resgisterDto);
    const { email, password, first_name, last_name, phoneNumber } =
      resgisterDto;

    // 1. check email ซ้ำ
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new Error('Email already exists');
    }

    // 2. hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. create user
    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        first_name,
        last_name,
        phoneNumber,
      },
    });

    // 4. generate JWT
    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    // 5. return (อย่าส่ง password กลับ!)
    return {
      message: 'Register success',
      access_token: token,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        phoneNumber: user.phoneNumber,
        role: user.role,
      },
    };
  }

  // ── GET ALL ──────────────────────────────────────────────────────────────────
  async findAll() {
    return this.prisma.user.findMany({
      select: SELECT_USER,
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── GET ONE ──────────────────────────────────────────────────────────────────
  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: SELECT_USER,
    });

    if (!user) throw new NotFoundException('ไม่พบผู้ใช้');
    return user;
  }

  // ── CREATE ───────────────────────────────────────────────────────────────────
  async create(dto: CreateUserDto) {
    // เช็ค email ซ้ำ
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('อีเมลนี้ถูกใช้งานแล้ว');

    const hashed = await bcrypt.hash(dto.password, 10);

    return this.prisma.user.create({
      data: {
        email: dto.email,
        first_name: dto.first_name,
        last_name: dto.last_name,
        phoneNumber: dto.phoneNumber,
        password: hashed,
        role: dto.role ?? 'USER',
      },
      select: SELECT_USER,
    });
  }

  // ── UPDATE ───────────────────────────────────────────────────────────────────
  async update(id: string, dto: UpdateUserDto) {
    // เช็คว่า user มีอยู่จริง
    await this.findOne(id);

    // ถ้าเปลี่ยน email เช็คซ้ำกับคนอื่น
    if (dto.email) {
      const existing = await this.prisma.user.findFirst({
        where: { email: dto.email, NOT: { id } },
      });
      if (existing) throw new ConflictException('อีเมลนี้ถูกใช้งานแล้ว');
    }

    const data: any = {
      email: dto.email,
      first_name: dto.first_name,
      last_name: dto.last_name,
      phoneNumber: dto.phoneNumber,
      role: dto.role,
    };

    // hash password ใหม่เฉพาะถ้าส่งมา
    if (dto.password) {
      data.password = await bcrypt.hash(dto.password, 10);
    }

    return this.prisma.user.update({
      where: { id },
      data,
      select: SELECT_USER,
    });
  }

  // ── DELETE ───────────────────────────────────────────────────────────────────
  async remove(id: string) {
    await this.findOne(id); // เช็คก่อนว่ามีอยู่จริง

    await this.prisma.user.delete({ where: { id } });

    return { message: 'ลบผู้ใช้สำเร็จ' };
  }

  // ── FIND BY EMAIL (ใช้ใน AuthService) ────────────────────────────────────────
  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }
}
