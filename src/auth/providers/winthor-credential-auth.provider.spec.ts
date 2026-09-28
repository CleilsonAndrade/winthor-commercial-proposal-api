import { OracleService } from '../../infrastructure/oracle/oracle.service';
import {
  mapWinthorUserToAuthenticatedPrincipal,
  WinthorCredentialAuthProvider,
} from './winthor-credential-auth.provider';

describe('WinthorCredentialAuthProvider', () => {
  const activeUser = {
    MATRICULA: 123,
    USUARIOBD: 'USUARIO.BD',
    NOME_GUERRA: 'USUARIO_TESTE',
    CODSETOR: 16,
    AREAATUACAO: 'DESENVOLVIMENTO',
    SITUACAO: 'A',
  };

  const createSubject = () => {
    const query = jest.fn();

    const oracleService = {
      query,
    } as unknown as OracleService;

    return {
      provider: new WinthorCredentialAuthProvider(oracleService),
      query,
    };
  };

  it('valida credenciais no Oracle usando binds e CRYPT', async () => {
    const { provider, query } = createSubject();

    query.mockResolvedValue([activeUser]);

    await expect(
      provider.authenticate({
        username: 'USUARIO.BD',
        password: 'SENHA_TESTE',
      }),
    ).resolves.toEqual({
      subject: 'winthor:123',
      registration: 123,
      username: 'USUARIO.BD',
      displayName: 'USUARIO_TESTE',
      roles: ['16', 'DESENVOLVIMENTO'],
      status: 'ativo',
      provider: 'winthor',
    });

    expect(query).toHaveBeenCalledTimes(1);

    const [sql, binds] = query.mock.calls[0] as [string, unknown];

    expect(sql).toContain('LTRIM(RTRIM(UPPER(E.USUARIOBD))) = :username');
    expect(sql).toContain('E.SENHABD = CRYPT(UPPER(:password), :username)');

    expect(binds).toEqual({
      username: 'USUARIO.BD',
      password: 'SENHA_TESTE',
    });
  });

  it('não seleciona SENHABD', async () => {
    const { provider, query } = createSubject();

    query.mockResolvedValue([activeUser]);

    await provider.authenticate({
      username: 'USUARIO.BD',
      password: 'SENHA_TESTE',
    });

    const [sql] = query.mock.calls[0] as [string];

    const selectClause = sql.split('FROM PCEMPR')[0].toUpperCase();

    expect(selectClause).not.toContain('SENHABD');
  });

  it('retorna null quando usuário ou senha não conferem', async () => {
    const { provider, query } = createSubject();

    query.mockResolvedValue([]);

    await expect(
      provider.authenticate({
        username: 'USUARIO.BD',
        password: 'SENHA_INCORRETA',
      }),
    ).resolves.toBeNull();
  });

  it('retorna null para username vazio sem consultar o banco', async () => {
    const { provider, query } = createSubject();

    await expect(
      provider.authenticate({
        username: '   ',
        password: 'SENHA_TESTE',
      }),
    ).resolves.toBeNull();

    expect(query).not.toHaveBeenCalled();
  });

  it('retorna null para senha vazia sem consultar o banco', async () => {
    const { provider, query } = createSubject();

    await expect(
      provider.authenticate({
        username: 'USUARIO.BD',
        password: '',
      }),
    ).resolves.toBeNull();

    expect(query).not.toHaveBeenCalled();
  });

  it('preserva usuário inativo no principal', async () => {
    const { provider, query } = createSubject();

    query.mockResolvedValue([
      {
        ...activeUser,
        SITUACAO: 'I',
      },
    ]);

    await expect(
      provider.authenticate({
        username: 'USUARIO.BD',
        password: 'SENHA_TESTE',
      }),
    ).resolves.toMatchObject({
      status: 'inativo',
      provider: 'winthor',
    });
  });

  it('normaliza username com trim e uppercase', async () => {
    const { provider, query } = createSubject();

    query.mockResolvedValue([activeUser]);

    await provider.authenticate({
      username: '  usuario.bd  ',
      password: 'SENHA_TESTE',
    });

    const [, binds] = query.mock.calls[0] as [string, Record<string, string>];

    expect(binds.username).toBe('USUARIO.BD');
  });

  it('mantém a senha original no bind e delega UPPER ao Oracle', async () => {
    const { provider, query } = createSubject();

    query.mockResolvedValue([activeUser]);

    await provider.authenticate({
      username: 'usuario.bd',
      password: ' Senha Com Espaço ',
    });

    const [, binds] = query.mock.calls[0] as [string, Record<string, string>];

    expect(binds).toEqual({
      username: 'USUARIO.BD',
      password: ' Senha Com Espaço ',
    });
  });

  it('mapeia fallback do displayName para USUARIOBD', () => {
    expect(
      mapWinthorUserToAuthenticatedPrincipal({
        ...activeUser,
        NOME_GUERRA: null,
      }),
    ).toMatchObject({
      username: 'USUARIO.BD',
      displayName: 'USUARIO.BD',
      provider: 'winthor',
    });
  });
});
