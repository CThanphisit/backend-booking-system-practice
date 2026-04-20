import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from 'src/generated/client';

export const GetUser = createParamDecorator(
  (data: keyof User | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<{ user: User }>();
    const user = request.user;

    if (data) {
      return user ? user[data] : undefined;
    }

    return user;
  },
);
