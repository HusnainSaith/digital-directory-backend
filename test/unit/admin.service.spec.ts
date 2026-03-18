import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AdminService } from '../../src/modules/admin/admin.service';
import { Business } from '../../src/modules/businesses/entities/business.entity';
import { User } from '../../src/modules/users/entities/user.entity';
import { RefreshToken } from '../../src/modules/auth/entities/refresh-token.entity';
import { Subscription } from '../../src/modules/subscriptions/entities/subscription.entity';
import { Payment } from '../../src/modules/payments/entities/payment.entity';
import { Review } from '../../src/modules/reviews/entities/review.entity';
import { SubscriptionPlan } from '../../src/modules/subscriptions/entities/subscription-plan.entity';
import { NotificationsService } from '../../src/modules/notifications/notifications.service';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { mockRepository } from '../utils/test-helpers';

describe('AdminService', () => {
  let service: AdminService;
  let businessRepo: ReturnType<typeof mockRepository>;
  let userRepo: ReturnType<typeof mockRepository>;
  let refreshTokenRepo: ReturnType<typeof mockRepository>;
  let subscriptionRepo: ReturnType<typeof mockRepository>;
  let paymentRepo: ReturnType<typeof mockRepository>;
  let reviewRepo: ReturnType<typeof mockRepository>;
  let planRepo: ReturnType<typeof mockRepository>;
  let notificationsService: Partial<NotificationsService>;

  beforeEach(async () => {
    businessRepo = mockRepository();
    userRepo = mockRepository();
    refreshTokenRepo = mockRepository();
    subscriptionRepo = mockRepository();
    paymentRepo = mockRepository();
    reviewRepo = mockRepository();
    planRepo = mockRepository();
    notificationsService = {
      sendEmail: jest.fn().mockResolvedValue(undefined),
      sendBroadcast: jest.fn().mockResolvedValue({ sent: 1, failed: 0 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: getRepositoryToken(Business), useValue: businessRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(RefreshToken), useValue: refreshTokenRepo },
        { provide: getRepositoryToken(Subscription), useValue: subscriptionRepo },
        { provide: getRepositoryToken(Payment), useValue: paymentRepo },
        { provide: getRepositoryToken(Review), useValue: reviewRepo },
        { provide: getRepositoryToken(SubscriptionPlan), useValue: planRepo },
        { provide: NotificationsService, useValue: notificationsService },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  describe('approveBusiness', () => {
    it('should throw NotFoundException when business not found', async () => {
      businessRepo.findOne.mockResolvedValue(null);
      await expect(service.approveBusiness('bad-id')).rejects.toThrow(NotFoundException);
    });

    it('should approve business and send email', async () => {
      const business = {
        id: 'biz-1',
        name: 'Test Biz',
        ownerEmail: 'owner@test.com',
        ownerName: 'Owner',
        slug: 'test-biz',
        verified: false,
        isApproved: false,
        approvedAt: null,
        rejectionReason: 'old',
      };
      businessRepo.findOne.mockResolvedValue(business);
      businessRepo.save.mockResolvedValue(business);

      const result = await service.approveBusiness('biz-1');

      expect(result.success).toBe(true);
      expect(business.verified).toBe(true);
      expect(business.isApproved).toBe(true);
      expect(business.rejectionReason).toBeNull();
      expect(notificationsService.sendEmail).toHaveBeenCalledWith(
        'listing-approved',
        'owner@test.com',
        expect.any(String),
        expect.objectContaining({ businessName: 'Test Biz' }),
      );
    });
  });

  describe('rejectBusiness', () => {
    it('should reject business and set reason', async () => {
      const business = {
        id: 'biz-1',
        name: 'Test Biz',
        ownerEmail: 'owner@test.com',
        verified: true,
        isApproved: true,
        rejectionReason: null,
      };
      businessRepo.findOne.mockResolvedValue(business);
      businessRepo.save.mockResolvedValue(business);

      const result = await service.rejectBusiness('biz-1', 'Bad content');

      expect(result.success).toBe(true);
      expect(business.verified).toBe(false);
      expect(business.isApproved).toBe(false);
      expect(business.rejectionReason).toBe('Bad content');
    });
  });

  describe('suspendUser', () => {
    it('should throw NotFoundException when user not found', async () => {
      userRepo.findOne.mockResolvedValue(null);
      await expect(service.suspendUser('bad-id')).rejects.toThrow(NotFoundException);
    });

    it('should deactivate user and revoke tokens', async () => {
      const user = { id: 'user-1', email: 'test@test.com', isActive: true };
      userRepo.findOne.mockResolvedValue(user);
      userRepo.save.mockResolvedValue(user);
      refreshTokenRepo.update.mockResolvedValue({});

      const result = await service.suspendUser('user-1');

      expect(result.success).toBe(true);
      expect(user.isActive).toBe(false);
      expect(refreshTokenRepo.update).toHaveBeenCalledWith(
        { userId: 'user-1' },
        { isRevoked: true },
      );
    });
  });

  describe('reinstateUser', () => {
    it('should reactivate user', async () => {
      const user = { id: 'user-1', email: 'test@test.com', isActive: false };
      userRepo.findOne.mockResolvedValue(user);
      userRepo.save.mockResolvedValue(user);

      const result = await service.reinstateUser('user-1');

      expect(result.success).toBe(true);
      expect(user.isActive).toBe(true);
    });
  });

  describe('resetUserPassword', () => {
    it('should throw NotFoundException when user not found', async () => {
      userRepo.findOne.mockResolvedValue(null);
      await expect(service.resetUserPassword('bad-id')).rejects.toThrow(NotFoundException);
    });

    it('should reset password with provided password', async () => {
      const user = { id: 'user-1', email: 'test@test.com', fullName: 'Test' };
      userRepo.findOne.mockResolvedValue(user);
      userRepo.update.mockResolvedValue({});
      refreshTokenRepo.update.mockResolvedValue({});

      const result = await service.resetUserPassword('user-1', 'NewPass123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual({});
      expect(userRepo.update).toHaveBeenCalled();
    });

    it('should generate temp password when none provided', async () => {
      const user = { id: 'user-1', email: 'test@test.com', fullName: 'Test' };
      userRepo.findOne.mockResolvedValue(user);
      userRepo.update.mockResolvedValue({});
      refreshTokenRepo.update.mockResolvedValue({});

      const result = await service.resetUserPassword('user-1');

      expect(result.success).toBe(true);
      expect(result.data.tempPassword).toBeDefined();
      expect(result.data.tempPassword.length).toBeGreaterThan(0);
    });
  });

  describe('createPlan', () => {
    it('should throw ConflictException if slug exists', async () => {
      planRepo.findOne.mockResolvedValue({ id: 'existing', slug: 'basic' });

      await expect(service.createPlan({ slug: 'basic' } as any)).rejects.toThrow(ConflictException);
    });

    it('should create a plan', async () => {
      planRepo.findOne.mockResolvedValue(null);
      const plan = { name: 'Basic', slug: 'basic', priceMonthly: 10 };
      planRepo.create.mockReturnValue(plan);
      planRepo.save.mockResolvedValue({ id: '1', ...plan });

      const result = await service.createPlan(plan as any);

      expect(result.success).toBe(true);
      expect(result.data.name).toBe('Basic');
    });
  });

  describe('deleteReview', () => {
    it('should throw NotFoundException for missing review', async () => {
      reviewRepo.findOne.mockResolvedValue(null);
      await expect(service.deleteReview('bad-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('broadcastNotification', () => {
    it('should send to individual user when userId provided', async () => {
      const user = { id: 'user-1', email: 'test@test.com', fullName: 'Test' };
      userRepo.findOne.mockResolvedValue(user);

      const result = await service.broadcastNotification('Subject', 'Content', undefined, 'user-1');

      expect(result.success).toBe(true);
      expect(notificationsService.sendBroadcast).toHaveBeenCalledWith(
        'Subject',
        'broadcast',
        expect.any(Object),
        [expect.objectContaining({ email: 'test@test.com' })],
      );
    });

    it('should throw NotFoundException for invalid userId', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(
        service.broadcastNotification('Subject', 'Content', undefined, 'bad-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should send to all active users when no filters', async () => {
      userRepo.find.mockResolvedValue([
        { id: 'u1', email: 'a@a.com', fullName: 'A' },
        { id: 'u2', email: 'b@b.com', fullName: 'B' },
      ]);

      await service.broadcastNotification('Subject', 'Content');

      expect(notificationsService.sendBroadcast).toHaveBeenCalledWith(
        'Subject',
        'broadcast',
        expect.any(Object),
        expect.arrayContaining([
          expect.objectContaining({ email: 'a@a.com' }),
          expect.objectContaining({ email: 'b@b.com' }),
        ]),
      );
    });
  });
});
