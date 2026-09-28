import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { OracleService } from './../src/infrastructure/oracle/oracle.service';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
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
      .compile();

    app = moduleFixture.createNestApplication();
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
});
