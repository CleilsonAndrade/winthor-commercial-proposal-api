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

  it('/commercial/filters/departments (GET) retorna 401 sem JWT', async () => {
    const httpServer = app.getHttpServer() as App;

    await request(httpServer)
      .get('/commercial/filters/departments')
      .expect(401);

    expect(oracleQuery).not.toHaveBeenCalled();
  });

  it('/commercial/filters/departments (GET) retorna departamentos para JWT válido', async () => {
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
        CODE: 600,
        NAME: 'BRINQUEDOS',
        STATUS: 'ATIVO',
        SECTION_COUNT: 89,
      },
      {
        CODE: 300,
        NAME: 'INATIVO- PRODUTOS FL',
        STATUS: 'INATIVO',
        SECTION_COUNT: 1,
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
      .get('/commercial/filters/departments')
      .set('Authorization', `Bearer ${body.access_token}`)
      .expect(200)
      .expect([
        {
          code: 600,
          name: 'BRINQUEDOS',
          status: 'ATIVO',
          sectionCount: 89,
        },
        {
          code: 300,
          name: 'INATIVO- PRODUTOS FL',
          status: 'INATIVO',
          sectionCount: 1,
        },
      ]);
  });

  it('/commercial/filters/departments (GET) encaminha pesquisa textual', async () => {
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
        CODE: 600,
        NAME: 'BRINQUEDOS',
        STATUS: 'ATIVO',
        SECTION_COUNT: 89,
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
      .get('/commercial/filters/departments')
      .query({
        search: 'BRIN',
      })
      .set('Authorization', `Bearer ${body.access_token}`)
      .expect(200);

    expect(oracleQuery).toHaveBeenCalledTimes(1);

    const [, binds] = oracleQuery.mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];

    expect(binds).toEqual({
      search: 'BRIN',
    });
  });

  it('/commercial/filters/sections (GET) retorna 401 sem JWT', async () => {
    const httpServer = app.getHttpServer() as App;

    await request(httpServer).get('/commercial/filters/sections').expect(401);

    expect(oracleQuery).not.toHaveBeenCalled();
  });

  it('/commercial/filters/sections (GET) retorna seções para JWT válido', async () => {
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
        CODE: 123,
        NAME: 'BONECAS',
        DEPARTMENT_CODE: 600,
        DEPARTMENT_NAME: 'BRINQUEDOS',
      },
      {
        CODE: 456,
        NAME: 'SEM DEPARTAMENTO',
        DEPARTMENT_CODE: null,
        DEPARTMENT_NAME: null,
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
      .get('/commercial/filters/sections')
      .set('Authorization', `Bearer ${body.access_token}`)
      .expect(200)
      .expect([
        {
          code: 123,
          name: 'BONECAS',
          departmentCode: 600,
          departmentName: 'BRINQUEDOS',
        },
        {
          code: 456,
          name: 'SEM DEPARTAMENTO',
          departmentCode: null,
          departmentName: null,
        },
      ]);
  });

  it('/commercial/filters/sections (GET) encaminha pesquisa textual', async () => {
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
        CODE: 123,
        NAME: 'BONECAS',
        DEPARTMENT_CODE: 600,
        DEPARTMENT_NAME: 'BRINQUEDOS',
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
      .get('/commercial/filters/sections')
      .query({
        search: 'BONE',
      })
      .set('Authorization', `Bearer ${body.access_token}`)
      .expect(200);

    expect(oracleQuery).toHaveBeenCalledTimes(1);

    const [, binds] = oracleQuery.mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];

    expect(binds).toEqual({
      search: 'BONE',
    });
  });

  it('/commercial/filters/parent-clients (GET) retorna 401 sem JWT', async () => {
    const httpServer = app.getHttpServer() as App;

    await request(httpServer)
      .get('/commercial/filters/parent-clients')
      .expect(401);

    expect(oracleQuery).not.toHaveBeenCalled();
  });

  it('/commercial/filters/parent-clients (GET) retorna clientes principais para JWT válido', async () => {
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
        CODE: 100,
        NAME: 'REDE TESTE',
        TRADE_NAME: 'REDE TESTE LTDA',
        DOCUMENT: '12345678000199',
        STORE_COUNT: 4,
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
      .get('/commercial/filters/parent-clients')
      .set('Authorization', `Bearer ${body.access_token}`)
      .expect(200)
      .expect([
        {
          code: 100,
          name: 'REDE TESTE',
          tradeName: 'REDE TESTE LTDA',
          document: '12345678000199',
          storeCount: 4,
        },
      ]);
  });

  it('/commercial/filters/parent-clients (GET) encaminha pesquisa textual', async () => {
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
        CODE: 100,
        NAME: 'REDE TESTE',
        TRADE_NAME: 'REDE TESTE LTDA',
        DOCUMENT: '12345678000199',
        STORE_COUNT: 4,
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
      .get('/commercial/filters/parent-clients')
      .query({
        search: 'REDE',
      })
      .set('Authorization', `Bearer ${body.access_token}`)
      .expect(200);

    expect(oracleQuery).toHaveBeenCalledTimes(1);

    const [, binds] = oracleQuery.mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];

    expect(binds).toEqual({
      search: 'REDE',
    });
  });

  it('/commercial/filters/clients (GET) retorna 401 sem JWT', async () => {
    const httpServer = app.getHttpServer() as App;

    await request(httpServer)
      .get('/commercial/filters/clients')
      .query({
        search: 'CLIENTE',
      })
      .expect(401);

    expect(oracleQuery).not.toHaveBeenCalled();
  });

  it('/commercial/filters/clients (GET) retorna 400 sem critério de pesquisa', async () => {
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
      .get('/commercial/filters/clients')
      .set('Authorization', `Bearer ${body.access_token}`)
      .expect(400);

    expect(oracleQuery).not.toHaveBeenCalled();
  });

  it('/commercial/filters/clients (GET) retorna clientes para JWT válido', async () => {
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
        CODE: 12345,
        NAME: 'CLIENTE TESTE LTDA',
        TRADE_NAME: 'CLIENTE TESTE',
        DOCUMENT: '12345678000199',
        CITY: 'SAO PAULO',
        BLOCKED: 'N',
        NETWORK_CODE: 100,
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
      .get('/commercial/filters/clients')
      .query({
        search: 'CLIENTE',
      })
      .set('Authorization', `Bearer ${body.access_token}`)
      .expect(200)
      .expect([
        {
          code: 12345,
          name: 'CLIENTE TESTE LTDA',
          tradeName: 'CLIENTE TESTE',
          document: '12345678000199',
          city: 'SAO PAULO',
          blocked: 'N',
          networkCode: 100,
        },
      ]);
  });

  it('/commercial/filters/clients (GET) encaminha nome e prefixo do documento', async () => {
    authenticate.mockResolvedValue({
      subject: 'winthor:123',
      registration: 123,
      username: 'USUARIO.BD',
      displayName: 'USUARIO_TESTE',
      roles: ['16', 'DESENVOLVIMENTO'],
      status: 'ativo',
      provider: 'winthor',
    });

    oracleQuery.mockResolvedValue([]);

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
      .get('/commercial/filters/clients')
      .query({
        search: 'AGROSEMA',
        documentPrefix: '12345678',
      })
      .set('Authorization', `Bearer ${body.access_token}`)
      .expect(200);

    expect(oracleQuery).toHaveBeenCalledTimes(1);

    const [, binds] = oracleQuery.mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];

    expect(binds).toEqual({
      search: 'AGROSEMA',
      documentPrefix: '12345678',
    });
  });

  it('/commercial/catalog/search (POST) retorna 401 sem JWT', async () => {
    const httpServer = app.getHttpServer() as App;

    await request(httpServer)
      .post('/commercial/catalog/search')
      .send({
        plazaCodes: [468],
      })
      .expect(401);

    expect(oracleQuery).not.toHaveBeenCalled();
  });

  it('/commercial/catalog/search (POST) retorna 400 sem praça', async () => {
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
      .post('/commercial/catalog/search')
      .set('Authorization', `Bearer ${body.access_token}`)
      .send({})
      .expect(400);

    expect(oracleQuery).not.toHaveBeenCalled();
  });

  it('/commercial/catalog/search (POST) retorna catálogo para JWT válido', async () => {
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
        PHOTO_PATH: '\\\\servidor\\WINTHOR\\IMG\\produto.jpg',
        PRODUCT_CODE: 123,
        DESCRIPTION: 'PRODUTO TESTE',

        MULTIPLE_QUANTITY: 1,
        INNER_BOX_QUANTITY: 6,
        MASTER_BOX_QUANTITY: 24,

        IPI_PERCENT: 5,
        IPI_VALUE: 2.5,
        MVA_PERCENT: 40,
        ST_VALUE: 3.5,

        PRICE_REGION_CODE: 368,
        PRICE_STATE: 'SP',
        PRICE_REGION_NAME: 'SAO PAULO',
        PRICE_REGION_TYPE: 'UF',

        NET_PRICE: 100,
        GROSS_PRICE: 106,
        DISCOUNT_PERCENT: 10,
        DISCOUNTED_NET_PRICE: 90,
        DISCOUNTED_GROSS_PRICE: 95.4,

        PROMOTION_START: new Date('2026-09-01T00:00:00.000Z'),
        PROMOTION_END: new Date('2026-09-30T00:00:00.000Z'),
        PROMOTION_PERCENT: 20,
        PROMOTION_MIN_QUANTITY: 3,
        PROMOTION_NET_PRICE: 80,
        PROMOTION_GROSS_PRICE: 84.8,

        ALERT: '',
        AVAILABLE_STOCK: 15,

        BRAND: 'MARCA TESTE',
        LINE_STATUS: 'EM LINHA',

        DEPARTMENT_CODE: 600,
        DEPARTMENT_NAME: 'BRINQUEDOS',
        SECTION_NAME: 'SECAO TESTE',
        SALES_CURVE: 'A',

        RESALE: 'S',
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

    const response = await request(httpServer)
      .post('/commercial/catalog/search')
      .set('Authorization', `Bearer ${body.access_token}`)
      .send({
        plazaCodes: [468],
        discountPercent: 10,
      })
      .expect(200);

    expect(response.body).toEqual([
      {
        productCode: 123,
        description: 'PRODUTO TESTE',
        photoAvailable: true,

        multipleQuantity: 1,
        innerBoxQuantity: 6,
        masterBoxQuantity: 24,

        ipiPercent: 5,
        ipiValue: 2.5,
        mvaPercent: 40,
        stValue: 3.5,

        priceRegionCode: 368,
        priceState: 'SP',
        priceRegionName: 'SAO PAULO',
        priceRegionType: 'UF',

        netPrice: 100,
        grossPrice: 106,
        discountPercent: 10,
        discountedNetPrice: 90,
        discountedGrossPrice: 95.4,

        promotionStart: '2026-09-01T00:00:00.000Z',
        promotionEnd: '2026-09-30T00:00:00.000Z',
        promotionPercent: 20,
        promotionMinQuantity: 3,
        promotionNetPrice: 80,
        promotionGrossPrice: 84.8,

        alert: '',
        availableStock: 15,

        brand: 'MARCA TESTE',
        lineStatus: 'EM LINHA',

        departmentCode: 600,
        departmentName: 'BRINQUEDOS',
        sectionName: 'SECAO TESTE',
        salesCurve: 'A',

        resale: 'S',
      },
    ]);

    expect(JSON.stringify(response.body)).not.toContain('WINTHOR\\\\IMG');

    expect(JSON.stringify(response.body)).not.toContain('"photoPath"');
  });

  it('/commercial/catalog/search (POST) monta SQL e binds sem sentinelas técnicos', async () => {
    authenticate.mockResolvedValue({
      subject: 'winthor:123',
      registration: 123,
      username: 'USUARIO.BD',
      displayName: 'USUARIO_TESTE',
      roles: ['16', 'DESENVOLVIMENTO'],
      status: 'ativo',
      provider: 'winthor',
    });

    oracleQuery.mockResolvedValue([]);

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
      .post('/commercial/catalog/search')
      .set('Authorization', `Bearer ${body.access_token}`)
      .send({
        plazaCodes: [468, 469],
        departmentCodes: [600],
        sectionCodes: [10, 20],
        parentClientCodes: [100],
        clientCodes: [12345],
        resale: 'YES',
        discountPercent: 10,
        maxFinalPrice: 500,
        pricePresence: 'WITH',
        innerBoxPresence: 'WITHOUT',
        minStock: 1,
        purchaseMonths: 12,
      })
      .expect(200)
      .expect([]);

    expect(oracleQuery).toHaveBeenCalledTimes(1);

    const [sql, binds] = oracleQuery.mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];

    expect(sql).toContain('PR.CODPRACA IN (:plaza0, :plaza1)');

    expect(sql).toContain('SEC.CODEPTO IN (:department0)');

    expect(sql).toContain('P.CODSEC IN (:section0, :section1)');

    expect(sql).toContain('IN (:parentClient0)');

    expect(sql).toContain('C.CODCLI IN (:client0)');

    expect(sql).not.toContain('-1 IN');
    expect(sql).not.toContain(':PRACA');
    expect(sql).not.toContain(':DEPARTAMENTO');
    expect(sql).not.toContain(':SECAO');

    expect(binds).toEqual({
      plaza0: 468,
      plaza1: 469,
      department0: 600,
      section0: 10,
      section1: 20,
      resale: 'S',
      discountPercent: 10,
      maxFinalPrice: 500,
      minStock: 1,
      innerBoxPresence: 'N',
      purchaseMonths: 12,
      parentClient0: 100,
      client0: 12345,
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
