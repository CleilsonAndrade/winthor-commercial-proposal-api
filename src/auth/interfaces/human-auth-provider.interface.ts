import { AuthenticatedPrincipal } from './authenticated-principal.interface';

export interface HumanAuthProvider<TCredentials = unknown> {
  authenticate(
    credentials: TCredentials,
  ): Promise<AuthenticatedPrincipal | null>;
}
