import { Controller, Get, Post, Body, Res, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import type { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { UserService } from 'src/user/user.service';
import { RegisterDto } from 'src/user/dto/register.dto';
import { GetUser } from 'src/common/decorators/get-user.decorator';
import type { User } from 'src/generated/client';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
  ) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.userService.register(registerDto);
  }

  @Post('login')
  async login(
    @Body() body: { email: string; password: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    console.log('bodyLogin', body);
    console.log('JWT_SECRET:', process.env.JWT_SECRET);
    const result = await this.authService.login(body.email, body.password);

    res.cookie('access_token', result.access_token, {
      httpOnly: true,
      // secure: process.env.NODE_ENV === 'production',
      secure: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    });

    res.cookie('role', result.user.role, {
      httpOnly: false, // ต้องอ่านได้ใน middleware
      // secure: process.env.NODE_ENV === 'production',
      secure: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    });

    return {
      message: 'Login success',
    };
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('access_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // dev
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/',
    });

    res.clearCookie('role', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production', // dev
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/',
    });

    return { message: 'Logout success' };
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  getMe(@GetUser() user: User) {
    return user;
  }
}
