import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DataSource } from 'typeorm';

describe('Auth Full Flow Integration Tests', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let accessToken: string;
  let refreshToken: string;

  const testEmail = `test_${Date.now()}@integration.test`;
  const testPassword = 'TestPass@123';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    dataSource = moduleFixture.get<DataSource>(DataSource);
    await app.init();
  }, 30000);

  afterAll(async () => {
    // Cleanup test user
    try {
      await dataSource.query('DELETE FROM users WHERE email = $1', [testEmail]);
    } catch {}
    await dataSource.destroy();
    await app.close();
  });

  describe('Registration Flow', () => {
    it('POST /auth/register — should register a new user', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: testEmail,
          password: testPassword,
          fullName: 'Integration Test User',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toHaveProperty('user');
          expect(res.body.data.user.email).toBe(testEmail);
        });
    });

    it('POST /auth/register — should reject duplicate email', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: testEmail,
          password: testPassword,
          fullName: 'Duplicate User',
        })
        .expect(409);
    });

    it('POST /auth/register — should reject invalid email', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'notanemail',
          password: testPassword,
          fullName: 'Bad Email',
        })
        .expect(400);
    });

    it('POST /auth/register — should reject weak password', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `weak_${Date.now()}@test.com`,
          password: '123',
          fullName: 'Weak Pass',
        })
        .expect(400);
    });
  });

  describe('Login Flow', () => {
    beforeAll(async () => {
      // Manually verify the user for login tests
      await dataSource.query(
        'UPDATE users SET is_verified = true WHERE email = $1',
        [testEmail],
      );
    });

    it('POST /auth/login — should login with valid credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testEmail, password: testPassword })
        .expect(200);

      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
      expect(res.body.data).toHaveProperty('user');
      accessToken = res.body.data.accessToken;
      refreshToken = res.body.data.refreshToken;
    });

    it('POST /auth/login — should reject invalid password', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testEmail, password: 'WrongPass@123' })
        .expect(401);
    });

    it('POST /auth/login — should reject non-existent email', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'noone@nowhere.com', password: testPassword })
        .expect(401);
    });
  });

  describe('Authenticated Endpoints', () => {
    it('GET /auth/me — should return current user profile', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.data.email).toBe(testEmail);
    });

    it('GET /auth/me — should reject without token', () => {
      return request(app.getHttpServer())
        .get('/auth/me')
        .expect(401);
    });

    it('GET /auth/me — should reject invalid token', () => {
      return request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);
    });
  });

  describe('Token Refresh', () => {
    it('POST /auth/refresh — should refresh access token', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
      // Update tokens for subsequent tests
      accessToken = res.body.data.accessToken;
      refreshToken = res.body.data.refreshToken;
    });

    it('POST /auth/refresh — should reject invalid refresh token', () => {
      return request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);
    });
  });

  describe('Password Reset Flow', () => {
    it('POST /auth/password-forgot — should accept valid email (no error)', () => {
      return request(app.getHttpServer())
        .post('/auth/password-forgot')
        .send({ email: testEmail })
        .expect(200);
    });

    it('POST /auth/password-forgot — should accept unknown email (no leak)', () => {
      return request(app.getHttpServer())
        .post('/auth/password-forgot')
        .send({ email: 'unknown@test.com' })
        .expect(200);
    });
  });

  describe('Logout', () => {
    it('POST /auth/logout — should revoke refresh token', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .send({ refreshToken })
        .expect(200);

      // After logout, refresh should fail
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(401);
    });
  });
});
