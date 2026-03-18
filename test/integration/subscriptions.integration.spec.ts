import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DataSource } from 'typeorm';

describe('Subscriptions & Payments Integration Tests', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let accessToken: string;

  const testEmail = `sub_test_${Date.now()}@integration.test`;
  const testPassword = 'TestPass@123';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    dataSource = moduleFixture.get<DataSource>(DataSource);
    await app.init();

    // Register and login
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: testEmail, password: testPassword, fullName: 'Sub Test' });

    await dataSource.query('UPDATE users SET is_verified = true WHERE email = $1', [testEmail]);

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: testEmail, password: testPassword });

    accessToken = loginRes.body.data.accessToken;
  }, 30000);

  afterAll(async () => {
    try {
      await dataSource.query('DELETE FROM users WHERE email = $1', [testEmail]);
    } catch {}
    await dataSource.destroy();
    await app.close();
  });

  describe('Subscription Plans', () => {
    it('GET /subscriptions/plans — should list active plans', async () => {
      const res = await request(app.getHttpServer())
        .get('/subscriptions/plans')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('Subscription Status', () => {
    it('GET /subscriptions/my — should return user subscription status', async () => {
      const res = await request(app.getHttpServer())
        .get('/subscriptions/my')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('GET /subscriptions/my — should reject unauthenticated', async () => {
      await request(app.getHttpServer())
        .get('/subscriptions/my')
        .expect(401);
    });
  });

  describe('Payments', () => {
    it('GET /payments — should return user payment history', async () => {
      const res = await request(app.getHttpServer())
        .get('/payments')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('GET /payments — should reject unauthenticated', async () => {
      await request(app.getHttpServer())
        .get('/payments')
        .expect(401);
    });
  });
});
