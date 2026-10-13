import type { Server } from 'node:http';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppController } from '../src/app.controller';
import { AppService } from '../src/app.service';

describe('Health live (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: { getHello: () => 'OK' },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('GET /health/live returns HTTP 200', async () => {
    await request(app.getHttpServer() as Server)
      .get('/health/live')
      .expect(200)
      .expect({ status: 'ok' });
  });
});
