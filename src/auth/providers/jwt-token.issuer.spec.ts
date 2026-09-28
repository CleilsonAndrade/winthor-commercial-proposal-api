import { JwtService } from '@nestjs/jwt';
import { AuthenticatedPrincipal } from '../interfaces/authenticated-principal.interface';
import { JwtTokenIssuer } from './jwt-token.issuer';

describe('JwtTokenIssuer', () => {
  it('emite somente o payload público esperado', () => {
    const sign = jest.fn().mockReturnValue('JWT_TESTE');

    const jwtService = {
      sign,
    } as unknown as JwtService;

    const issuer = new JwtTokenIssuer(jwtService);

    const principal: AuthenticatedPrincipal = {
      subject: 'winthor:123',
      registration: 123,
      username: 'USUARIO.BD',
      displayName: 'USUARIO_TESTE',
      roles: ['16', 'DESENVOLVIMENTO'],
      status: 'ativo',
      provider: 'winthor',
    };

    expect(issuer.issue(principal)).toBe('JWT_TESTE');

    expect(sign).toHaveBeenCalledWith({
      registration: 123,
      name: 'USUARIO_TESTE',
      roles: ['16', 'DESENVOLVIMENTO'],
      status: 'ativo',
    });

    const payload = JSON.stringify(sign.mock.calls);

    expect(payload).not.toContain('SENHA');
    expect(payload).not.toContain('USUARIO.BD');
    expect(payload).not.toContain('winthor:123');
  });
});
