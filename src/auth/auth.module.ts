import { Module } from '@nestjs/common';
import { OracleModule } from '../infrastructure/oracle/oracle.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { HUMAN_AUTH_PROVIDER } from './auth.tokens';
import { WinthorCredentialAuthProvider } from './providers/winthor-credential-auth.provider';

@Module({
  imports: [OracleModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    WinthorCredentialAuthProvider,
    {
      provide: HUMAN_AUTH_PROVIDER,
      useExisting: WinthorCredentialAuthProvider,
    },
  ],
  exports: [AuthService, HUMAN_AUTH_PROVIDER, WinthorCredentialAuthProvider],
})
export class AuthModule {}
