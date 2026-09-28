import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { OracleModule } from '../infrastructure/oracle/oracle.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { HUMAN_AUTH_PROVIDER, TOKEN_ISSUER } from './auth.tokens';
import { JwtStrategy } from './jwt.strategy';
import { JwtTokenIssuer } from './providers/jwt-token.issuer';
import { WinthorCredentialAuthProvider } from './providers/winthor-credential-auth.provider';

@Module({
  imports: [
    ConfigModule,
    OracleModule,
    PassportModule.register({
      defaultStrategy: 'jwt',
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): JwtModuleOptions => {
        const secret = configService.get<string>('JWT_SECRET');

        if (!secret) {
          throw new Error(
            'JWT_SECRET is not defined in environment variables.',
          );
        }

        const expiresInValue = (configService.get<string>(
          'JWT_EXPIRATION_TIME',
        ) ?? '60m') as NonNullable<
          JwtModuleOptions['signOptions']
        >['expiresIn'];

        return {
          secret,
          signOptions: {
            expiresIn: expiresInValue,
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    WinthorCredentialAuthProvider,
    JwtTokenIssuer,
    JwtStrategy,
    {
      provide: HUMAN_AUTH_PROVIDER,
      useExisting: WinthorCredentialAuthProvider,
    },
    {
      provide: TOKEN_ISSUER,
      useExisting: JwtTokenIssuer,
    },
  ],
  exports: [
    AuthService,
    JwtModule,
    PassportModule,
    JwtStrategy,
    HUMAN_AUTH_PROVIDER,
    TOKEN_ISSUER,
  ],
})
export class AuthModule {}
