import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { HUMAN_AUTH_PROVIDER } from './../src/auth/auth.tokens';
import { OracleService } from './../src/infrastructure/oracle/oracle.service';

interface LoginResponseBody {
  access_token: string;
  userName: string;
}

function isLoginResponseBody(value: unknown): value is LoginResponseBody {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.access_token === 'string' &&
    typeof candidate.userName === 'string'
  );
}

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let authenticate: jest.Mock;
  let oracleQuery: jest.Mock;

  beforeEach(async () => {
    process.env.JWT_SECRET = 'jwt-secret-exclusivo-para-testes-e2e';
    process.env.JWT_EXPIRATION_TIME = '60m';

    authenticate = jest.fn();
    oracleQuery = jest.fn();

    const oracleServiceMock = {
      health: jest.fn().mockResolvedValue({
        status: 'ok',
        driverVersion: 'test',
        driverMode: 'thin',
        database: 'TESTE',
        user: 'TEST',
        test: 1,
      }),
      query: oracleQuery,
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(OracleService)
      .useValue(oracleServiceMock)
      .overrideProvider(HUMAN_AUTH_PROVIDER)
      .useValue({
        authenticate,
      })
      .compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/ (GET)', async () => {
    const httpServer = app.getHttpServer() as App;

    await request(httpServer).get('/').expect(200).expect('Hello World!');
  });

  it('/health/oracle (GET)', async () => {
    const httpServer = app.getHttpServer() as App;

    await request(httpServer).get('/health/oracle').expect(200).expect({
      status: 'ok',
      driverVersion: 'test',
      driverMode: 'thin',
      database: 'TESTE',
      user: 'TEST',
      test: 1,
    });
  });

  it('/auth/login (POST) emite JWT para credencial válida', async () => {
    authenticate.mockResolvedValue({
      subject: 'winthor:123',
      registration: 123,
      username: 'USUARIO.BD',
      displayName: 'USUARIO_TESTE',
      roles: ['16', 'DESENVOLVIMENTO'],
      status: 'ativo',
      provider: 'winthor',
    });

    const httpServer = app.getHttpServer() as App;

    const response = await request(httpServer)
      .post('/auth/login')
      .send({
        username: 'USUARIO.BD',
        password: 'SENHA_TESTE',
      })
      .expect(200);

    const body: unknown = response.body;

    expect(isLoginResponseBody(body)).toBe(true);

    if (!isLoginResponseBody(body)) {
      throw new Error('Resposta de login fora do contrato esperado');
    }

    expect(body.access_token.length).toBeGreaterThan(20);
    expect(body.userName).toBe('USUARIO_TESTE');
  });

  it('/auth/login (POST) retorna 401 para credencial inválida', async () => {
    authenticate.mockResolvedValue(null);

    const httpServer = app.getHttpServer() as App;

    await request(httpServer)
      .post('/auth/login')
      .send({
        username: 'USUARIO.BD',
        password: 'ERRADA',
      })
      .expect(401);
  });

  it('/auth/login (POST) retorna 400 para body inválido', async () => {
    const httpServer = app.getHttpServer() as App;

    await request(httpServer)
      .post('/auth/login')
      .send({
        username: '',
      })
      .expect(400);

    expect(authenticate).not.toHaveBeenCalled();
  });

  it('/auth/me (GET) aceita JWT emitido pelo login', async () => {
    authenticate.mockResolvedValue({
      subject: 'winthor:123',
      registration: 123,
      username: 'USUARIO.BD',
      displayName: 'USUARIO_TESTE',
      roles: ['16', 'DESENVOLVIMENTO'],
      status: 'ativo',
      provider: 'winthor',
    });

    const httpServer = app.getHttpServer() as App;

    const loginResponse = await request(httpServer)
      .post('/auth/login')
      .send({
        username: 'USUARIO.BD',
        password: 'SENHA_TESTE',
      })
      .expect(200);

    const body: unknown = loginResponse.body;

    if (!isLoginResponseBody(body)) {
      throw new Error('Resposta de login fora do contrato esperado');
    }

    await request(httpServer)
      .get('/auth/me')
      .set('Authorization', `Bearer ${body.access_token}`)
      .expect(200)
      .expect({
        registration: 123,
        name: 'USUARIO_TESTE',
        roles: ['16', 'DESENVOLVIMENTO'],
      });
  });

  it('/auth/me (GET) retorna 401 sem JWT', async () => {
    const httpServer = app.getHttpServer() as App;

    await request(httpServer).get('/auth/me').expect(401);
  });

  it('/auth/me (GET) retorna 401 para JWT adulterado', async () => {
    authenticate.mockResolvedValue({
      subject: 'winthor:123',
      registration: 123,
      username: 'USUARIO.BD',
      displayName: 'USUARIO_TESTE',
      roles: ['16', 'DESENVOLVIMENTO'],
      status: 'ativo',
      provider: 'winthor',
    });

    const httpServer = app.getHttpServer() as App;

    const loginResponse = await request(httpServer)
      .post('/auth/login')
      .send({
        username: 'USUARIO.BD',
        password: 'SENHA_TESTE',
      })
      .expect(200);

    const body: unknown = loginResponse.body;

    if (!isLoginResponseBody(body)) {
      throw new Error('Resposta de login fora do contrato esperado');
    }

    const tamperedToken = `${body.access_token}x`;

    await request(httpServer)
      .get('/auth/me')
      .set('Authorization', `Bearer ${tamperedToken}`)
      .expect(401);
  });

  it('/commercial/filters/plazas (GET) retorna 401 sem JWT', async () => {
    const httpServer = app.getHttpServer() as App;

    await request(httpServer).get('/commercial/filters/plazas').expect(401);

    expect(oracleQuery).not.toHaveBeenCalled();
  });

  it('/commercial/filters/plazas (GET) retorna praças para JWT válido', async () => {
    authenticate.mockResolvedValue({
      subject: 'winthor:123',
      registration: 123,
      username: 'USUARIO.BD',
      displayName: 'USUARIO_TESTE',
      roles: ['16', 'DESENVOLVIMENTO'],
      status: 'ativo',
      provider: 'winthor',
    });

    oracleQuery.mockResolvedValue([
      {
        CODE: 468,
        NAME: 'SAO PAULO',
        REGION_CODE: 368,
        STATE: 'SP',
        TYPE: 'UF',
      },
      {
        CODE: 383,
        NAME: 'COBASI - SP',
        REGION_CODE: 383,
        STATE: 'SP',
        TYPE: 'ESPECIAL',
      },
    ]);

    const httpServer = app.getHttpServer() as App;

    const loginResponse = await request(httpServer)
      .post('/auth/login')
      .send({
        username: 'USUARIO.BD',
        password: 'SENHA_TESTE',
      })
      .expect(200);

    const body: unknown = loginResponse.body;

    if (!isLoginResponseBody(body)) {
      throw new Error('Resposta de login fora do contrato esperado');
    }

    await request(httpServer)
      .get('/commercial/filters/plazas')
      .set('Authorization', `Bearer ${body.access_token}`)
      .expect(200)
      .expect([
        {
          code: 468,
          name: 'SAO PAULO',
          regionCode: 368,
          state: 'SP',
          type: 'UF',
        },
        {
          code: 383,
          name: 'COBASI - SP',
          regionCode: 383,
          state: 'SP',
          type: 'ESPECIAL',
        },
      ]);
  });

  it('/commercial/filters/plazas (GET) encaminha pesquisa textual', async () => {
    authenticate.mockResolvedValue({
      subject: 'winthor:123',
      registration: 123,
      username: 'USUARIO.BD',
      displayName: 'USUARIO_TESTE',
      roles: ['16', 'DESENVOLVIMENTO'],
      status: 'ativo',
      provider: 'winthor',
    });

    oracleQuery.mockResolvedValue([
      {
        CODE: 468,
        NAME: 'SAO PAULO',
        REGION_CODE: 368,
        STATE: 'SP',
        TYPE: 'UF',
      },
    ]);

    const httpServer = app.getHttpServer() as App;

    const loginResponse = await request(httpServer)
      .post('/auth/login')
      .send({
        username: 'USUARIO.BD',
        password: 'SENHA_TESTE',
      })
      .expect(200);

    const body: unknown = loginResponse.body;

    if (!isLoginResponseBody(body)) {
      throw new Error('Resposta de login fora do contrato esperado');
    }

    await request(httpServer)
      .get('/commercial/filters/plazas')
      .query({
        search: 'SAO',
      })
      .set('Authorization', `Bearer ${body.access_token}`)
      .expect(200);

    expect(oracleQuery).toHaveBeenCalledTimes(1);

    const [, binds] = oracleQuery.mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];

    expect(binds).toEqual({
      search: 'SAO',
    });
  });

  it('/auth/verify (POST) não existe mais', async () => {
    const httpServer = app.getHttpServer() as App;

    await request(httpServer)
      .post('/auth/verify')
      .send({
        username: 'USUARIO.BD',
        password: 'SENHA_TESTE',
      })
      .expect(404);

    expect(authenticate).not.toHaveBeenCalled();
  });
});
