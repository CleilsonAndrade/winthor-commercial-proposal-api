import {
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthenticatedPrincipal } from './interfaces/authenticated-principal.interface';
import { HumanAuthProvider } from './interfaces/human-auth-provider.interface';
import { TokenIssuer } from './interfaces/token-issuer.interface';
import { WinthorCredentials } from './interfaces/winthor-credentials.interface';

describe('AuthService', () => {
  const activePrincipal: AuthenticatedPrincipal = {
    subject: 'winthor:123',
    registration: 123,
    username: 'USUARIO.BD',
    displayName: 'USUARIO_TESTE',
    roles: ['16', 'DESENVOLVIMENTO'],
    status: 'ativo',
    provider: 'winthor',
  };

  const createSubject = () => {
    const authenticate = jest.fn();
    const issue = jest.fn();

    const provider = {
      authenticate,
    } as unknown as HumanAuthProvider<WinthorCredentials>;

    const tokenIssuer = {
      issue,
    } as unknown as TokenIssuer;

    return {
      service: new AuthService(provider, tokenIssuer),
      authenticate,
      issue,
    };
  };

  it('retorna usuário sanitizado na verificação válida', async () => {
    const { service, authenticate } = createSubject();

    authenticate.mockResolvedValue(activePrincipal);

    await expect(service.verify('USUARIO.BD', 'SENHA_TESTE')).resolves.toEqual({
      authenticated: true,
      user: {
        registration: 123,
        username: 'USUARIO.BD',
        displayName: 'USUARIO_TESTE',
        roles: ['16', 'DESENVOLVIMENTO'],
      },
    });
  });

  it('emite token no login válido', async () => {
    const { service, authenticate, issue } = createSubject();

    authenticate.mockResolvedValue(activePrincipal);
    issue.mockReturnValue('JWT_TESTE');

    await expect(service.login('USUARIO.BD', 'SENHA_TESTE')).resolves.toEqual({
      access_token: 'JWT_TESTE',
      userName: 'USUARIO_TESTE',
    });

    expect(issue).toHaveBeenCalledWith(activePrincipal);
  });

  it('retorna 401 para credencial inválida', async () => {
    const { service, authenticate, issue } = createSubject();

    authenticate.mockResolvedValue(null);

    await expect(
      service.login('USUARIO.BD', 'SENHA_INCORRETA'),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(issue).not.toHaveBeenCalled();
  });

  it('retorna 401 para usuário inativo', async () => {
    const { service, authenticate, issue } = createSubject();

    authenticate.mockResolvedValue({
      ...activePrincipal,
      status: 'inativo',
    });

    await expect(
      service.login('USUARIO.BD', 'SENHA_TESTE'),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(issue).not.toHaveBeenCalled();
  });

  it('sanitiza falha inesperada do provider', async () => {
    const { service, authenticate } = createSubject();

    authenticate.mockRejectedValue(
      new Error('ORA-99999 SEGREDO_INTERNO SENHA_SUPER_SECRETA'),
    );

    await expect(
      service.login('USUARIO.BD', 'SENHA_SUPER_SECRETA'),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });

  it('sanitiza falha inesperada ao emitir JWT', async () => {
    const { service, authenticate, issue } = createSubject();

    authenticate.mockResolvedValue(activePrincipal);

    issue.mockImplementation(() => {
      throw new Error('JWT_SECRET_SUPER_SECRET');
    });

    await expect(
      service.login('USUARIO.BD', 'SENHA_TESTE'),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });
});
