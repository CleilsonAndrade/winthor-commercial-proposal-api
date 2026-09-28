import { AuthenticatedPrincipal } from './authenticated-principal.interface';

export interface TokenIssuer {
  issue(principal: AuthenticatedPrincipal): string;
}
