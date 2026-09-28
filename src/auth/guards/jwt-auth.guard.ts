import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = unknown>(
    err: unknown,
    user: TUser | false | null,
  ): TUser {
    if (err instanceof Error) {
      throw err;
    }

    if (err || !user) {
      throw new UnauthorizedException(
        'Access denied: Invalid or not provided token.',
      );
    }

    return user;
  }
}
