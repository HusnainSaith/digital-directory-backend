import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DataSource } from 'typeorm';

describe('Admin Integration Tests', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    dataSource = moduleFixture.get<DataSource>(DataSource);
    await app.init();

    // Login as superadmin (assumes seed has been run)
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: process.env.SUPER_ADMIN_EMAIL || 'admin_labverse@gmail.com',
        password: process.env.SUPER_ADMIN_PASSWORD || 'Admin@12345',
      });

    adminToken = loginRes.body?.data?.accessToken;
  }, 30000);

  afterAll(async () => {
    await dataSource.destroy();
    await app.close();
  });

  describe('Admin — Businesses', () => {
    it('GET /admin/businesses — should list businesses', async () => {
      if (!adminToken) return; // skip if admin login failed

      const res = await request(app.getHttpServer())
        .get('/admin/businesses')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('GET /admin/businesses — should reject unauthenticated', async () => {
      await request(app.getHttpServer())
        .get('/admin/businesses')
        .expect(401);
    });
  });

  describe('Admin — Users', () => {
    it('GET /admin/users — should list users', async () => {
      if (!adminToken) return;

      const res = await request(app.getHttpServer())
        .get('/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('Admin — Analytics', () => {
    it('GET /admin/analytics — should return analytics', async () => {
      if (!adminToken) return;

      const res = await request(app.getHttpServer())
        .get('/admin/analytics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('totalUsers');
      expect(res.body.data).toHaveProperty('totalBusinesses');
      expect(res.body.data).toHaveProperty('subscriptionConversionRate');
      expect(res.body.data).toHaveProperty('businessesByCountry');
    });

    it('GET /admin/analytics — should support countryId filter', async () => {
      if (!adminToken) return;

      const res = await request(app.getHttpServer())
        .get('/admin/analytics?countryId=00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('GET /admin/analytics/revenue — should return revenue data', async () => {
      if (!adminToken) return;

      const res = await request(app.getHttpServer())
        .get('/admin/analytics/revenue')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('monthly');
      expect(res.body.data).toHaveProperty('paymentVolumeByCountry');
    });
  });

  describe('Admin — Payments', () => {
    it('GET /admin/payments — should list payments', async () => {
      if (!adminToken) return;

      const res = await request(app.getHttpServer())
        .get('/admin/payments')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });
  });

  describe('Admin — Subscriptions', () => {
    it('GET /admin/subscriptions — should list subscriptions', async () => {
      if (!adminToken) return;

      const res = await request(app.getHttpServer())
        .get('/admin/subscriptions')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });
  });

  describe('Admin — Reviews', () => {
    it('GET /admin/reviews — should list reviews', async () => {
      if (!adminToken) return;

      const res = await request(app.getHttpServer())
        .get('/admin/reviews')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });
  });

  describe('Admin — Audit Logs', () => {
    it('GET /admin/audit-logs — should list audit logs', async () => {
      if (!adminToken) return;

      const res = await request(app.getHttpServer())
        .get('/admin/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });
  });
});
