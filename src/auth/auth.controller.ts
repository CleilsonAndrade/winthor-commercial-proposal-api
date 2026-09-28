import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthService, LoginResult } from './auth.service';
import { WinthorLoginDto } from './dto/winthor-login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type {
  RequestWithUser,
  UserPayload,
} from './interfaces/request-with-user.interface';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() body: WinthorLoginDto): Promise<LoginResult> {
    return this.authService.login(body.username, body.password);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() request: RequestWithUser): UserPayload {
    return request.user;
  }
}
