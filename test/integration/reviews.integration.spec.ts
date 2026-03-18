import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DataSource } from 'typeorm';

describe('Reviews Integration Tests', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let accessToken: string;
  let userId: string;
  let testBusinessId: string;
  let testReviewId: string;

  const testEmail = `review_test_${Date.now()}@integration.test`;
  const testPassword = 'TestPass@123';
  const testSlug = `review-test-biz-${Date.now()}`;

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
      .send({ email: testEmail, password: testPassword, fullName: 'Review Tester' });

    await dataSource.query(
      'UPDATE users SET is_verified = true WHERE email = $1',
      [testEmail],
    );

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: testEmail, password: testPassword });

    accessToken = loginRes.body.data.accessToken;
    userId = loginRes.body.data.user.id;

    // Create a test business directly in DB for review tests
    const result = await dataSource.query(
      `INSERT INTO businesses (name, slug, owner_id, verified, is_approved, is_active)
       VALUES ($1, $2, $3, true, true, true)
       RETURNING id`,
      ['Review Test Business', testSlug, userId],
    );
    testBusinessId = result[0]?.id;

    // Also create an active subscription for it so non-owner access works
    if (testBusinessId) {
      const planResult = await dataSource.query(
        'SELECT id FROM subscription_plans WHERE is_active = true LIMIT 1',
      );
      if (planResult.length > 0) {
        await dataSource.query(
          `INSERT INTO subscriptions (user_id, business_id, plan_id, status, current_period_start, current_period_end)
           VALUES ($1, $2, $3, 'active', NOW(), NOW() + INTERVAL '30 days')`,
          [userId, testBusinessId, planResult[0].id],
        );
      }
    }
  }, 30000);

  afterAll(async () => {
    try {
      if (testBusinessId) {
        await dataSource.query('DELETE FROM reviews WHERE business_id = $1', [testBusinessId]);
        await dataSource.query('DELETE FROM subscriptions WHERE business_id = $1', [testBusinessId]);
        await dataSource.query('DELETE FROM businesses WHERE id = $1', [testBusinessId]);
      }
      await dataSource.query('DELETE FROM users WHERE email = $1', [testEmail]);
    } catch {}
    await dataSource.destroy();
    await app.close();
  });

  describe('Create Review', () => {
    it('POST /reviews — should create a review for a business', async () => {
      if (!testBusinessId) return;

      const res = await request(app.getHttpServer())
        .post('/reviews')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          businessId: testBusinessId,
          rating: 5,
          title: 'Excellent!',
          comment: 'Great service and friendly staff.',
          reviewerName: 'Review Tester',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.rating).toBe(5);
      testReviewId = res.body.data.id;
    });

    it('POST /reviews — should prevent duplicate review from same user', async () => {
      if (!testBusinessId) return;

      await request(app.getHttpServer())
        .post('/reviews')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          businessId: testBusinessId,
          rating: 4,
          title: 'Another review',
          comment: 'Should be blocked',
          reviewerName: 'Review Tester',
        })
        .expect(409);
    });

    it('POST /reviews — should reject without authentication', async () => {
      await request(app.getHttpServer())
        .post('/reviews')
        .send({
          businessId: testBusinessId,
          rating: 3,
          title: 'Anon',
          comment: 'No auth',
        })
        .expect(401);
    });
  });

  describe('Read Reviews', () => {
    it('GET /reviews/business/:businessId — should return reviews for a business', async () => {
      if (!testBusinessId) return;

      const res = await request(app.getHttpServer())
        .get(`/reviews/business/${testBusinessId}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('GET /reviews/:id — should return a specific review', async () => {
      if (!testReviewId) return;

      const res = await request(app.getHttpServer())
        .get(`/reviews/${testReviewId}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(testReviewId);
    });

    it('GET /reviews/:id — should 404 for non-existent review', async () => {
      await request(app.getHttpServer())
        .get('/reviews/00000000-0000-4000-a000-000000000000')
        .expect(404);
    });
  });

  describe('Update Review', () => {
    it('PATCH /reviews/:id — should update own review', async () => {
      if (!testReviewId) return;

      const res = await request(app.getHttpServer())
        .patch(`/reviews/${testReviewId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ rating: 4, comment: 'Updated review comment' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.comment).toBe('Updated review comment');
    });
  });

  describe('Delete Review', () => {
    it('DELETE /reviews/:id — should delete own review', async () => {
      if (!testReviewId) return;

      await request(app.getHttpServer())
        .delete(`/reviews/${testReviewId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    it('DELETE /reviews/:id — should 404 for already deleted review', async () => {
      if (!testReviewId) return;

      await request(app.getHttpServer())
        .delete(`/reviews/${testReviewId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });
});
