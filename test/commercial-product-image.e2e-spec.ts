import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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

describe('CommercialProductImageController (e2e)', () => {
  let app: INestApplication;
  let authenticate: jest.Mock;
  let oracleQuery: jest.Mock;
  let imageRoot: string;

  const imageBytes = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0xff,
    0xd9,
  ]);

  beforeEach(async () => {
    imageRoot = await mkdtemp(join(tmpdir(), 'commercial-product-image-e2e-'));

    await mkdir(join(imageRoot, 'UD_BQ'), {
      recursive: true,
    });

    await writeFile(join(imageRoot, 'UD_BQ', 'AD21F1.jpg'), imageBytes);

    process.env.JWT_SECRET = 'jwt-secret-exclusivo-para-testes-e2e';
    process.env.JWT_EXPIRATION_TIME = '60m';
    process.env.WINTHOR_IMAGE_ROOT = imageRoot;

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

    await rm(imageRoot, {
      recursive: true,
      force: true,
    });

    delete process.env.WINTHOR_IMAGE_ROOT;
  });

  const authenticateUser = () => {
    authenticate.mockResolvedValue({
      subject: 'winthor:123',
      registration: 123,
      username: 'USUARIO.BD',
      displayName: 'USUARIO_TESTE',
      roles: ['16', 'DESENVOLVIMENTO'],
      status: 'ativo',
      provider: 'winthor',
    });
  };

  const login = async (): Promise<string> => {
    authenticateUser();

    const httpServer = app.getHttpServer() as App;

    const response = await request(httpServer)
      .post('/auth/login')
      .send({
        username: 'USUARIO.BD',
        password: 'SENHA_TESTE',
      })
      .expect(200);

    const body: unknown = response.body;

    if (!isLoginResponseBody(body)) {
      throw new Error('Resposta de login fora do contrato esperado');
    }

    return body.access_token;
  };

  it('/commercial/products/:productCode/image retorna 401 sem JWT', async () => {
    const httpServer = app.getHttpServer() as App;

    await request(httpServer)
      .get('/commercial/products/7624/image')
      .expect(401);

    expect(oracleQuery).not.toHaveBeenCalled();
  });

  it('/commercial/products/:productCode/image retorna 400 para código inválido', async () => {
    const token = await login();
    const httpServer = app.getHttpServer() as App;

    await request(httpServer)
      .get('/commercial/products/invalido/image')
      .set('Authorization', `Bearer ${token}`)
      .expect(400);

    expect(oracleQuery).not.toHaveBeenCalled();
  });

  it('/commercial/products/:productCode/image retorna 404 sem foto', async () => {
    const token = await login();
    const httpServer = app.getHttpServer() as App;

    oracleQuery.mockResolvedValue([
      {
        PHOTO_PATH: null,
      },
    ]);

    const response = await request(httpServer)
      .get('/commercial/products/7624/image')
      .set('Authorization', `Bearer ${token}`)
      .expect(404);

    expect(response.body).toEqual({
      message: 'Imagem do produto não disponível',
      error: 'Not Found',
      statusCode: 404,
    });

    expect(oracleQuery).toHaveBeenCalledTimes(1);
  });

  it('/commercial/products/:productCode/image entrega a imagem pelo backend', async () => {
    const token = await login();
    const httpServer = app.getHttpServer() as App;

    oracleQuery.mockResolvedValue([
      {
        PHOTO_PATH: '\\\\10.122.175.3\\WINTHOR\\IMG\\UD_BQ\\AD21F1.jpg',
      },
    ]);

    const response = await request(httpServer)
      .get('/commercial/products/7624/image')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect('Content-Type', /image\/jpeg/)
      .expect('Content-Disposition', 'inline; filename="AD21F1.jpg"');

    expect(Buffer.isBuffer(response.body)).toBe(true);
    expect(response.body).toEqual(imageBytes);

    expect(oracleQuery).toHaveBeenCalledTimes(1);
    expect(oracleQuery).toHaveBeenCalledWith(
      expect.stringContaining('FROM PCPRODUT'),
      {
        productCode: 7624,
      },
    );
  });
});
