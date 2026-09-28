import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { HUMAN_AUTH_PROVIDER, TOKEN_ISSUER } from './auth.tokens';
import type { AuthenticatedPrincipal } from './interfaces/authenticated-principal.interface';
import type { HumanAuthProvider } from './interfaces/human-auth-provider.interface';
import type { TokenIssuer } from './interfaces/token-issuer.interface';
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

export interface LoginResult {
  access_token: string;
  userName: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(HUMAN_AUTH_PROVIDER)
    private readonly humanAuthProvider: HumanAuthProvider<WinthorCredentials>,
    @Inject(TOKEN_ISSUER)
    private readonly tokenIssuer: TokenIssuer,
  ) {}

  async verify(
    username: string,
    password: string,
  ): Promise<AuthVerificationResult> {
    try {
      const principal = await this.authenticateActive(username, password);

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
      this.handleAuthenticationError(
        error,
        'Could not verify credentials due to an internal error.',
      );
    }
  }

  async login(username: string, password: string): Promise<LoginResult> {
    try {
      const principal = await this.authenticateActive(username, password);
      const accessToken = this.tokenIssuer.issue(principal);

      return {
        access_token: accessToken,
        userName: principal.displayName,
      };
    } catch (error: unknown) {
      this.handleAuthenticationError(
        error,
        'Could not log in due to an internal error.',
      );
    }
  }

  private async authenticateActive(
    username: string,
    password: string,
  ): Promise<AuthenticatedPrincipal> {
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

    return principal;
  }

  private handleAuthenticationError(
    error: unknown,
    internalMessage: string,
  ): never {
    if (error instanceof UnauthorizedException) {
      throw error;
    }

    this.logger.error('Falha interna durante autenticação');

    throw new InternalServerErrorException(internalMessage);
  }
}
