import { Module } from '@nestjs/common';
import { OracleModule } from '../infrastructure/oracle/oracle.module';
import { HUMAN_AUTH_PROVIDER } from './auth.tokens';
import { WinthorCredentialAuthProvider } from './providers/winthor-credential-auth.provider';

@Module({
  imports: [OracleModule],
  providers: [
    WinthorCredentialAuthProvider,
    {
      provide: HUMAN_AUTH_PROVIDER,
      useExisting: WinthorCredentialAuthProvider,
    },
  ],
  exports: [HUMAN_AUTH_PROVIDER, WinthorCredentialAuthProvider],
})
export class AuthModule {}
