import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Role } from 'src/generated/enums';

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  first_name: string;
  last_name: string;
  phoneNumber: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req) => {
          return req?.cookies?.access_token;
        },
      ]),
      secretOrKey: ConfigService.get<string>('JWT_SECRET'),
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
