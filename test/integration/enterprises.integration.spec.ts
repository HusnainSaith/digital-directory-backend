import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DataSource } from 'typeorm';

describe('Businesses Integration Tests', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let accessToken: string;
  let userId: string;

  const testEmail = `business_test_${Date.now()}@integration.test`;
  const testPassword = 'TestPass@123';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    dataSource = moduleFixture.get<DataSource>(DataSource);
    await app.init();

    // Register and login a test user
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: testEmail, password: testPassword, fullName: 'Biz Test User' });

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
      await dataSource.query(
        'DELETE FROM businesses WHERE owner_id = (SELECT id FROM users WHERE email = $1)',
        [testEmail],
      );
      await dataSource.query('DELETE FROM users WHERE email = $1', [testEmail]);
    } catch {}
    await dataSource.destroy();
    await app.close();
  });

  describe('Public Endpoints', () => {
    it('GET /businesses — should return public listing', async () => {
      const res = await request(app.getHttpServer())
        .get('/businesses')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('GET /businesses — should not require authentication', async () => {
      await request(app.getHttpServer())
        .get('/businesses')
        .expect(200);
    });
  });

  describe('Authenticated Endpoints', () => {
    it('GET /businesses — authenticated user gets results', async () => {
      const res = await request(app.getHttpServer())
        .get('/businesses')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('GET /businesses/:id — should 404 for non-existent ID', async () => {
      await request(app.getHttpServer())
        .get('/businesses/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('Search Integration', () => {
    it('GET /search — should return search results', async () => {
      const res = await request(app.getHttpServer())
        .get('/search')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('meta');
    });

    it('GET /search — should support query param', async () => {
      const res = await request(app.getHttpServer())
        .get('/search?q=test')
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('GET /search/suggestions — should return suggestions', async () => {
      const res = await request(app.getHttpServer())
        .get('/search/suggestions?q=te')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });
});
