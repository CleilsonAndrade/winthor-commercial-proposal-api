import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { HUMAN_AUTH_PROVIDER } from './../src/auth/auth.tokens';
import { OracleService } from './../src/infrastructure/oracle/oracle.service';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let authenticate: jest.Mock;

  beforeEach(async () => {
    authenticate = jest.fn();

    const oracleServiceMock = {
      health: jest.fn().mockResolvedValue({
        status: 'ok',
        driverVersion: 'test',
        driverMode: 'thin',
        database: 'TESTE',
        user: 'TEST',
        test: 1,
      }),
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

  it('/auth/verify (POST) autentica credencial válida', async () => {
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

    await request(httpServer)
      .post('/auth/verify')
      .send({
        username: 'USUARIO.BD',
        password: 'SENHA_TESTE',
      })
      .expect(200)
      .expect({
        authenticated: true,
        user: {
          registration: 123,
          username: 'USUARIO.BD',
          displayName: 'USUARIO_TESTE',
          roles: ['16', 'DESENVOLVIMENTO'],
        },
      });
  });

  it('/auth/verify (POST) retorna 401 para credencial inválida', async () => {
    authenticate.mockResolvedValue(null);

    const httpServer = app.getHttpServer() as App;

    await request(httpServer)
      .post('/auth/verify')
      .send({
        username: 'USUARIO.BD',
        password: 'ERRADA',
      })
      .expect(401);
  });

  it('/auth/verify (POST) retorna 400 para body inválido', async () => {
    const httpServer = app.getHttpServer() as App;

    await request(httpServer)
      .post('/auth/verify')
      .send({
        username: '',
      })
      .expect(400);

    expect(authenticate).not.toHaveBeenCalled();
  });
});
