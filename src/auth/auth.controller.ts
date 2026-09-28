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
import {
  AuthService,
  AuthVerificationResult,
  LoginResult,
} from './auth.service';
import { WinthorLoginDto } from './dto/winthor-login.dto';
import { WinthorVerifyDto } from './dto/winthor-verify.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type {
  RequestWithUser,
  UserPayload,
} from './interfaces/request-with-user.interface';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  verify(@Body() body: WinthorVerifyDto): Promise<AuthVerificationResult> {
    return this.authService.verify(body.username, body.password);
  }

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
