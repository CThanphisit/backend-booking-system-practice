import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@/generated/enums';
import { Auth } from '@/common/decorators/auth.decorator';
import { GetUser } from '@/common/decorators/get-user.decorator';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import type { User } from '@/generated/client';

@Controller('users')
@UseGuards(AuthGuard('jwt'))
export class UserController {
  constructor(private readonly userService: UserService) {}

  // @Post('register')
  // async register(@Body() registerDto: RegisterDto) {
  //   return this.userService.register(registerDto);
  // }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  @Auth(Role.ADMIN)
  findAll() {
    return this.userService.findAll();
  }

  // ── GET ONE (Admin only) ────────────────────────────────────────────────────
  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  @Auth(Role.ADMIN)
  findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  // ── CREATE (Admin only) ─────────────────────────────────────────────────────
  @Post()
  @UseGuards(AuthGuard('jwt'))
  @Auth(Role.ADMIN)
  create(@Body() dto: CreateUserDto) {
    return this.userService.create(dto);
  }

  // ── UPDATE ME (user แก้ข้อมูลตัวเอง) ──────────────────────────────────────
  @Patch('me')
  updateMe(@GetUser() user: User, @Body() dto: UpdateUserDto) {
    return this.userService.update(user.id, dto);
  }

  // ── UPDATE (Admin only) ─────────────────────────────────────────────────────
  @Patch(':id')
  @UseGuards(AuthGuard('jwt'))
  @Auth(Role.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.userService.update(id, dto);
  }

  // ── DELETE (Admin only) ─────────────────────────────────────────────────────
  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  @Auth(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }
}
