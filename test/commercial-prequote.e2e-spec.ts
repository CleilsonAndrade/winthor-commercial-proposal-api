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

describe('CommercialPreQuoteController (e2e)', () => {
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

  const catalogRow = {
    PHOTO_PATH: null,
    PRODUCT_CODE: 7624,
    DESCRIPTION: 'AD21F1 ANDADOR INFANTIL AZUL',

    MULTIPLE_QUANTITY: 1,
    INNER_BOX_QUANTITY: 6,
    MASTER_BOX_QUANTITY: 24,

    IPI_PERCENT: 5,
    IPI_VALUE: 2.5,
    MVA_PERCENT: 40,
    ST_VALUE: 3.47,

    PRICE_REGION_CODE: 368,
    PRICE_STATE: 'SP',
    PRICE_REGION_NAME: 'SAO PAULO',
    PRICE_REGION_TYPE: 'UF',

    NET_PRICE: 91.85,
    GROSS_PRICE: 97.82,
    DISCOUNT_PERCENT: 10,
    DISCOUNTED_NET_PRICE: 82.67,
    DISCOUNTED_GROSS_PRICE: 88.04,

    PROMOTION_START: null,
    PROMOTION_END: null,
    PROMOTION_PERCENT: 0,
    PROMOTION_MIN_QUANTITY: null,
    PROMOTION_NET_PRICE: null,
    PROMOTION_GROSS_PRICE: null,

    ALERT: '',
    AVAILABLE_STOCK: 100,

    BRAND: 'TESTE',
    LINE_STATUS: 'EM LINHA',

    DEPARTMENT_CODE: 600,
    DEPARTMENT_NAME: 'BRINQUEDOS',
    SECTION_NAME: 'TESTE',
    SALES_CURVE: 'A',

    RESALE: 'S',
  };

  it('/commercial/pre-quotes/calculate retorna 401 sem JWT', async () => {
    const httpServer = app.getHttpServer() as App;

    await request(httpServer)
      .post('/commercial/pre-quotes/calculate')
      .send({
        plazaCodes: [468],
        items: [
          {
            productCode: 7624,
            quantity: 12,
          },
        ],
      })
      .expect(401);

    expect(oracleQuery).not.toHaveBeenCalled();
  });

  it('/commercial/pre-quotes/calculate retorna 400 para body inválido', async () => {
    const token = await login();
    const httpServer = app.getHttpServer() as App;

    await request(httpServer)
      .post('/commercial/pre-quotes/calculate')
      .set('Authorization', `Bearer ${token}`)
      .send({
        plazaCodes: [468],
        items: [],
      })
      .expect(400);

    expect(oracleQuery).not.toHaveBeenCalled();
  });

  it('/commercial/pre-quotes/calculate rejeita preço enviado pelo cliente', async () => {
    const token = await login();
    const httpServer = app.getHttpServer() as App;

    await request(httpServer)
      .post('/commercial/pre-quotes/calculate')
      .set('Authorization', `Bearer ${token}`)
      .send({
        plazaCodes: [468],
        items: [
          {
            productCode: 7624,
            quantity: 12,
            unitPrice: 0.01,
          },
        ],
      })
      .expect(400);

    expect(oracleQuery).not.toHaveBeenCalled();
  });

  it('/commercial/pre-quotes/calculate resolve produto e preço pelo backend', async () => {
    const token = await login();
    const httpServer = app.getHttpServer() as App;

    oracleQuery.mockResolvedValue([catalogRow]);

    const response = await request(httpServer)
      .post('/commercial/pre-quotes/calculate')
      .set('Authorization', `Bearer ${token}`)
      .send({
        plazaCodes: [468],
        discountPercent: 10,
        items: [
          {
            productCode: 7624,
            quantity: 12,
          },
        ],
      })
      .expect(200);

    const body: unknown = response.body;

    expect(body).toEqual({
      context: {
        plazaCodes: [468],
        discountPercent: 10,
      },
      items: [
        {
          quantity: 12,
          product: {
            productCode: 7624,
            description: 'AD21F1 ANDADOR INFANTIL AZUL',
            photoAvailable: false,

            multipleQuantity: 1,
            innerBoxQuantity: 6,
            masterBoxQuantity: 24,

            ipiPercent: 5,
            ipiValue: 2.5,
            mvaPercent: 40,
            stValue: 3.47,

            priceRegionCode: 368,
            priceState: 'SP',
            priceRegionName: 'SAO PAULO',
            priceRegionType: 'UF',

            netPrice: 91.85,
            grossPrice: 97.82,
            discountPercent: 10,
            discountedNetPrice: 82.67,
            discountedGrossPrice: 88.04,

            promotionStart: null,
            promotionEnd: null,
            promotionPercent: 0,
            promotionMinQuantity: null,
            promotionNetPrice: null,
            promotionGrossPrice: null,

            alert: '',
            availableStock: 100,

            brand: 'TESTE',
            lineStatus: 'EM LINHA',

            departmentCode: 600,
            departmentName: 'BRINQUEDOS',
            sectionName: 'TESTE',
            salesCurve: 'A',

            resale: 'S',
          },
        },
      ],
    });

    expect(oracleQuery).toHaveBeenCalledTimes(1);

    const [, binds] = oracleQuery.mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];

    expect(binds).toMatchObject({
      plaza0: 468,
      discountPercent: 10,
    });
  });
});
