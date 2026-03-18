import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { SubscriptionsService } from '../../src/modules/subscriptions/subscriptions.service';
import { Subscription } from '../../src/modules/subscriptions/entities/subscription.entity';
import { SubscriptionPlan } from '../../src/modules/subscriptions/entities/subscription-plan.entity';
import { Payment } from '../../src/modules/payments/entities/payment.entity';
import { Business } from '../../src/modules/businesses/entities/business.entity';
import { User } from '../../src/modules/users/entities/user.entity';
import { NotificationsService } from '../../src/modules/notifications/notifications.service';
import { InvoiceService } from '../../src/common/services/invoice.service';
import { SubscriptionStatus } from '../../src/common/enums/subscription-status.enum';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { mockRepository } from '../utils/test-helpers';

describe('SubscriptionsService', () => {
  let service: SubscriptionsService;
  let subscriptionRepo: ReturnType<typeof mockRepository>;
  let planRepo: ReturnType<typeof mockRepository>;
  let paymentRepo: ReturnType<typeof mockRepository>;
  let businessRepo: ReturnType<typeof mockRepository>;
  let userRepo: ReturnType<typeof mockRepository>;
  let notificationsService: Partial<NotificationsService>;

  beforeEach(async () => {
    subscriptionRepo = mockRepository();
    planRepo = mockRepository();
    paymentRepo = mockRepository();
    businessRepo = mockRepository();
    userRepo = mockRepository();
    notificationsService = {
      sendEmail: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionsService,
        { provide: getRepositoryToken(Subscription), useValue: subscriptionRepo },
        { provide: getRepositoryToken(SubscriptionPlan), useValue: planRepo },
        { provide: getRepositoryToken(Payment), useValue: paymentRepo },
        { provide: getRepositoryToken(Business), useValue: businessRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('sk_test_fake') } },
        { provide: NotificationsService, useValue: notificationsService },
        { provide: InvoiceService, useValue: { generateAndUpload: jest.fn().mockResolvedValue('https://r2.example.com/invoices/inv.pdf') } },
      ],
    }).compile();

    service = module.get<SubscriptionsService>(SubscriptionsService);
  });

  describe('listPlans', () => {
    it('should return active plans sorted by sortOrder', async () => {
      const plans = [
        { id: '1', name: 'Basic', sortOrder: 1, isActive: true },
        { id: '2', name: 'Pro', sortOrder: 2, isActive: true },
      ];
      planRepo.find.mockResolvedValue(plans);

      const result = await service.listPlans();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(plans);
      expect(planRepo.find).toHaveBeenCalledWith({
        where: { isActive: true },
        order: { sortOrder: 'ASC' },
      });
    });
  });

  describe('getStatus', () => {
    it('should return subscriptions for a user', async () => {
      const subs = [{ id: 'sub-1', userId: 'user-1', status: 'active' }];
      subscriptionRepo.find.mockResolvedValue(subs);

      const result = await service.getStatus('user-1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(subs);
    });
  });

  describe('getBusinessStatus', () => {
    it('should return subscription for a business', async () => {
      const sub = { id: 'sub-1', businessId: 'biz-1', userId: 'user-1' };
      subscriptionRepo.findOne.mockResolvedValue(sub);

      const result = await service.getBusinessStatus('biz-1', 'user-1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(sub);
    });

    it('should return null when no subscription found', async () => {
      subscriptionRepo.findOne.mockResolvedValue(null);

      const result = await service.getBusinessStatus('biz-1', 'user-1');

      expect(result.data).toBeNull();
    });
  });

  describe('cancel', () => {
    it('should throw NotFoundException when subscription not found', async () => {
      subscriptionRepo.findOne.mockResolvedValue(null);

      await expect(service.cancel('user-1', 'sub-999')).rejects.toThrow(NotFoundException);
    });

    it('should cancel subscription and set autoRenew to false', async () => {
      const sub = {
        id: 'sub-1',
        userId: 'user-1',
        stripeSubscriptionId: null,
        canceledAt: null,
        autoRenew: true,
      };
      subscriptionRepo.findOne.mockResolvedValue(sub);
      subscriptionRepo.save.mockResolvedValue(sub);

      const result = await service.cancel('user-1', 'sub-1');

      expect(result.success).toBe(true);
      expect(sub.autoRenew).toBe(false);
      expect(sub.canceledAt).toBeDefined();
    });
  });

  describe('toggleAutoRenew', () => {
    it('should throw NotFoundException when subscription not found', async () => {
      subscriptionRepo.findOne.mockResolvedValue(null);

      await expect(service.toggleAutoRenew('user-1', 'sub-999', true)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for non-active subscriptions', async () => {
      subscriptionRepo.findOne.mockResolvedValue({
        id: 'sub-1',
        status: SubscriptionStatus.CANCELLED,
        stripeSubscriptionId: null,
      });

      await expect(service.toggleAutoRenew('user-1', 'sub-1', true)).rejects.toThrow(BadRequestException);
    });

    it('should toggle auto-renew on active subscription', async () => {
      const sub = {
        id: 'sub-1',
        status: SubscriptionStatus.ACTIVE,
        stripeSubscriptionId: null,
        autoRenew: false,
      };
      subscriptionRepo.findOne.mockResolvedValue(sub);
      subscriptionRepo.save.mockResolvedValue({ ...sub, autoRenew: true });

      const result = await service.toggleAutoRenew('user-1', 'sub-1', true);

      expect(result.success).toBe(true);
      expect(result.message).toContain('enabled');
    });
  });

  describe('checkExpiredSubscriptions', () => {
    it('should mark expired subscriptions and deactivate businesses', async () => {
      const expiredSub = {
        id: 'sub-1',
        businessId: 'biz-1',
        userId: 'user-1',
        status: SubscriptionStatus.ACTIVE,
        plan: { name: 'Basic' },
      };
      subscriptionRepo.find.mockResolvedValue([expiredSub]);
      subscriptionRepo.save.mockResolvedValue(expiredSub);
      businessRepo.update.mockResolvedValue({});
      userRepo.findOne.mockResolvedValue({ email: 'test@test.com', fullName: 'Test' });

      const count = await service.checkExpiredSubscriptions();

      expect(count).toBe(1);
      expect(subscriptionRepo.save).toHaveBeenCalled();
      expect(businessRepo.update).toHaveBeenCalledWith('biz-1', { isActive: false });
    });
  });
});
