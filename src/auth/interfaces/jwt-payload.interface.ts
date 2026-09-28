export interface JwtPayload {
  registration: number;
  name: string;
  roles: string[];
  status: 'ativo' | 'inativo';
}
