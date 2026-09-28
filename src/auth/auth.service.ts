import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { HUMAN_AUTH_PROVIDER } from './auth.tokens';
import type { HumanAuthProvider } from './interfaces/human-auth-provider.interface';
import type { WinthorCredentials } from './interfaces/winthor-credentials.interface';

export interface AuthVerificationResult {
  authenticated: true;
  user: {
    registration: number;
    username: string;
    displayName: string;
    roles: string[];
  };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(HUMAN_AUTH_PROVIDER)
    private readonly humanAuthProvider: HumanAuthProvider<WinthorCredentials>,
  ) {}

  async verify(
    username: string,
    password: string,
  ): Promise<AuthVerificationResult> {
    try {
      const principal = await this.humanAuthProvider.authenticate({
        username,
        password,
      });

      if (!principal) {
        throw new UnauthorizedException('Invalid credentials.');
      }

      if (principal.status !== 'ativo') {
        throw new UnauthorizedException('Inactive user.');
      }

      return {
        authenticated: true,
        user: {
          registration: principal.registration,
          username: principal.username,
          displayName: principal.displayName,
          roles: principal.roles,
        },
      };
    } catch (error: unknown) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      this.logger.error('Falha interna durante autenticação');

      throw new InternalServerErrorException(
        'Could not verify credentials due to an internal error.',
      );
    }
  }
}
