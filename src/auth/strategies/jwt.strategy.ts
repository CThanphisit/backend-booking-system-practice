import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Role } from 'src/generated/enums';
import { ConfigService } from '@nestjs/config';

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  first_name: string;
  last_name: string;
  phoneNumber: string;
}
console.log('JWT_SECRET:', process.env.JWT_SECRET);

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req) => req?.cookies?.access_token,
      ]),
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  validate(payload: JwtPayload) {
    // console.log('validate รัน payload:', payload);
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      first_name: payload.first_name,
      last_name: payload.last_name,
      phoneNumber: payload.phoneNumber,
    };
  }
}
