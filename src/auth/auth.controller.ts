import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService, AuthVerificationResult } from './auth.service';
import { WinthorVerifyDto } from './dto/winthor-verify.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  verify(@Body() body: WinthorVerifyDto): Promise<AuthVerificationResult> {
    return this.authService.verify(body.username, body.password);
  }
}
