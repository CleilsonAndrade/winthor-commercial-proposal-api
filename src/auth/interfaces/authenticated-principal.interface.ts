export interface AuthenticatedPrincipal {
  subject: string;
  registration: number;
  username: string;
  displayName: string;
  roles: string[];
  status: 'ativo' | 'inativo';
  provider: 'winthor';
}
