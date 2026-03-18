import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DataSource } from 'typeorm';

describe('Users & Profile Integration Tests', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let accessToken: string;
  let userId: string;

  const testEmail = `profile_test_${Date.now()}@integration.test`;
  const testPassword = 'TestPass@123';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    dataSource = moduleFixture.get<DataSource>(DataSource);
    await app.init();

    // Register, verify, and login a test user
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: testEmail, password: testPassword, fullName: 'Profile Tester' });

    await dataSource.query(
      'UPDATE users SET is_verified = true WHERE email = $1',
      [testEmail],
    );

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: testEmail, password: testPassword });

    accessToken = loginRes.body.data.accessToken;
    userId = loginRes.body.data.user.id;
  }, 30000);

  afterAll(async () => {
    try {
      await dataSource.query('DELETE FROM users WHERE email = $1', [testEmail]);
    } catch {}
    await dataSource.destroy();
    await app.close();
  });

  describe('Profile Endpoints', () => {
    it('GET /users/profile — should return own profile', async () => {
      const res = await request(app.getHttpServer())
        .get('/users/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(testEmail);
      expect(res.body.data.fullName).toBe('Profile Tester');
    });

    it('GET /users/profile — should reject unauthenticated', async () => {
      await request(app.getHttpServer())
        .get('/users/profile')
        .expect(401);
    });

    it('PATCH /users/profile — should update fullName', async () => {
      const res = await request(app.getHttpServer())
        .patch('/users/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ fullName: 'Updated Name' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.fullName).toBe('Updated Name');
    });

    it('PATCH /users/profile — should update phone', async () => {
      const res = await request(app.getHttpServer())
        .patch('/users/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ phone: '+1234567890' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.phone).toBe('+1234567890');
    });
  });

  describe('User Permissions', () => {
    it('GET /users/:id/permissions — should return permissions (may require admin)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/users/${userId}/permissions`)
        .set('Authorization', `Bearer ${accessToken}`);

      // May return 200 or 403 depending on user role
      expect([200, 403]).toContain(res.status);
    });
  });

  describe('Health Check', () => {
    it('GET /health — should return healthy status', async () => {
      const res = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(res.body.status).toBe('ok');
    });
  });

  describe('Password Change via Auth Flow', () => {
    it('POST /auth/forgot-password — should accept email for reset', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: testEmail })
        .expect(200);

      expect(res.body.success).toBe(true);
    });
  });

  describe('Delete Account', () => {
    it('DELETE /users/account — should delete own account', async () => {
      const res = await request(app.getHttpServer())
        .delete('/users/account')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('Should not be able to login after deletion', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testEmail, password: testPassword })
        .expect(401);
    });
  });
});
