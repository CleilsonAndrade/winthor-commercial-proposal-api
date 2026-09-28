import { Injectable } from '@nestjs/common';
import { OracleService } from '../../infrastructure/oracle/oracle.service';
import { AuthenticatedPrincipal } from '../interfaces/authenticated-principal.interface';
import { HumanAuthProvider } from '../interfaces/human-auth-provider.interface';
import { WinthorCredentials } from '../interfaces/winthor-credentials.interface';

interface WinthorUserRow {
  MATRICULA: number | null;
  USUARIOBD: string | null;
  NOME_GUERRA: string | null;
  CODSETOR: number | null;
  AREAATUACAO: string | null;
  SITUACAO: string | null;
}

export function mapWinthorUserToAuthenticatedPrincipal(
  user: WinthorUserRow,
): AuthenticatedPrincipal {
  const registration = user.MATRICULA ?? 0;
  const username = user.USUARIOBD ?? '';
  const displayName = user.NOME_GUERRA ?? username;

  const roles: string[] = [
    user.CODSETOR?.toString(),
    user.AREAATUACAO ?? undefined,
  ].filter((role): role is string => Boolean(role));

  return {
    subject: `winthor:${registration}`,
    registration,
    username,
    displayName,
    roles,
    status: user.SITUACAO === 'A' ? 'ativo' : 'inativo',
    provider: 'winthor',
  };
}

@Injectable()
export class WinthorCredentialAuthProvider implements HumanAuthProvider<WinthorCredentials> {
  constructor(private readonly oracleService: OracleService) {}

  async authenticate(
    credentials: WinthorCredentials,
  ): Promise<AuthenticatedPrincipal | null> {
    const username = credentials.username.trim().toUpperCase();

    if (!username || !credentials.password) {
      return null;
    }

    const rows = await this.oracleService.query<WinthorUserRow>(
      `SELECT
         E.MATRICULA,
         E.USUARIOBD,
         E.NOME_GUERRA,
         E.CODSETOR,
         E.AREAATUACAO,
         E.SITUACAO
       FROM PCEMPR E
       WHERE LTRIM(RTRIM(UPPER(E.USUARIOBD))) = :username
         AND E.SENHABD = CRYPT(UPPER(:password), :username)`,
      {
        username,
        password: credentials.password,
      },
    );

    const user = rows[0];

    if (!user) {
      return null;
    }

    return mapWinthorUserToAuthenticatedPrincipal(user);
  }
}
