import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, LessThan } from 'typeorm';
import { JobsService } from '../../src/modules/jobs/jobs.service';
import { SubscriptionsService } from '../../src/modules/subscriptions/subscriptions.service';
import { NotificationsService } from '../../src/modules/notifications/notifications.service';
import { RefreshToken } from '../../src/modules/auth/entities/refresh-token.entity';
import { mockRepository } from '../utils/test-helpers';

describe('JobsService', () => {
  let service: JobsService;
  let subscriptionsService: Partial<SubscriptionsService>;
  let notificationsService: Partial<NotificationsService>;
  let refreshTokenRepo: ReturnType<typeof mockRepository>;
  let dataSource: any;

  beforeEach(async () => {
    subscriptionsService = {
      checkExpiredSubscriptions: jest.fn().mockResolvedValue(3),
      getExpiringSubscriptions: jest.fn().mockResolvedValue([]),
    };
    notificationsService = {
      sendEmail: jest.fn().mockResolvedValue(undefined),
      retryFailed: jest.fn().mockResolvedValue(2),
      cleanupOldLogs: jest.fn().mockResolvedValue(10),
    };
    refreshTokenRepo = mockRepository();
    dataSource = {
      manager: {
        query: jest.fn().mockResolvedValue([]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobsService,
        { provide: SubscriptionsService, useValue: subscriptionsService },
        { provide: NotificationsService, useValue: notificationsService },
        { provide: getRepositoryToken(RefreshToken), useValue: refreshTokenRepo },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<JobsService>(JobsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── CHECK EXPIRED SUBSCRIPTIONS ──────────────────────────────
  describe('checkExpiredSubscriptions', () => {
    it('should delegate to subscriptionsService', async () => {
      await service.checkExpiredSubscriptions();

      expect(subscriptionsService.checkExpiredSubscriptions).toHaveBeenCalled();
    });
  });

  // ─── 7-DAY EXPIRY REMINDERS ───────────────────────────────────
  describe('send7DayExpiryReminders', () => {
    it('should send reminders for subscriptions expiring in 7 days', async () => {
      const futureDate = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000); // 6 days from now
      const expiringSub = {
        id: 'sub-1',
        businessId: 'biz-1',
        userId: 'user-1',
        currentPeriodEnd: futureDate,
        user: { email: 'test@test.com', fullName: 'Test User' },
        plan: { name: 'Basic' },
      };
      (subscriptionsService.getExpiringSubscriptions as jest.Mock).mockResolvedValue([expiringSub]);
      dataSource.manager.query.mockResolvedValue([{ name: 'My Business' }]);

      await service.send7DayExpiryReminders();

      expect(notificationsService.sendEmail).toHaveBeenCalledWith(
        'subscription-expiry-reminder',
        'test@test.com',
        expect.stringContaining('expires in'),
        expect.objectContaining({
          businessName: 'My Business',
          planName: 'Basic',
        }),
        'user-1',
      );
    });

    it('should filter out subscriptions expiring within 1 day', async () => {
      const soonDate = new Date(Date.now() + 12 * 60 * 60 * 1000); // 12 hours from now
      const expiringSub = {
        id: 'sub-1',
        businessId: 'biz-1',
        userId: 'user-1',
        currentPeriodEnd: soonDate,
        user: { email: 'test@test.com', fullName: 'Test' },
        plan: { name: 'Basic' },
      };
      (subscriptionsService.getExpiringSubscriptions as jest.Mock).mockResolvedValue([expiringSub]);

      await service.send7DayExpiryReminders();

      expect(notificationsService.sendEmail).not.toHaveBeenCalled();
    });

    it('should skip subscriptions where user has no email', async () => {
      const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
      const sub = {
        id: 'sub-1',
        businessId: 'biz-1',
        userId: 'user-1',
        currentPeriodEnd: futureDate,
        user: { email: null },
        plan: { name: 'Basic' },
      };
      (subscriptionsService.getExpiringSubscriptions as jest.Mock).mockResolvedValue([sub]);

      await service.send7DayExpiryReminders();

      expect(notificationsService.sendEmail).not.toHaveBeenCalled();
    });

    it('should fallback to "Your business" when DB lookup fails', async () => {
      const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
      const sub = {
        id: 'sub-1',
        businessId: 'biz-1',
        userId: 'user-1',
        currentPeriodEnd: futureDate,
        user: { email: 'test@test.com', fullName: 'Test' },
        plan: { name: 'Premium' },
      };
      (subscriptionsService.getExpiringSubscriptions as jest.Mock).mockResolvedValue([sub]);
      dataSource.manager.query.mockRejectedValue(new Error('DB fail'));

      await service.send7DayExpiryReminders();

      expect(notificationsService.sendEmail).toHaveBeenCalledWith(
        'subscription-expiry-reminder',
        'test@test.com',
        expect.any(String),
        expect.objectContaining({ businessName: 'Your business' }),
        'user-1',
      );
    });
  });

  // ─── 1-DAY EXPIRY REMINDERS ───────────────────────────────────
  describe('send1DayExpiryReminders', () => {
    it('should send reminder for subscriptions expiring tomorrow', async () => {
      const sub = {
        id: 'sub-1',
        businessId: 'biz-1',
        userId: 'user-1',
        user: { email: 'test@test.com', fullName: 'Test' },
        plan: { name: 'Basic' },
      };
      (subscriptionsService.getExpiringSubscriptions as jest.Mock).mockResolvedValue([sub]);
      dataSource.manager.query.mockResolvedValue([{ name: 'My Biz' }]);

      await service.send1DayExpiryReminders();

      expect(notificationsService.sendEmail).toHaveBeenCalledWith(
        'subscription-expiry-reminder',
        'test@test.com',
        'Your subscription expires tomorrow!',
        expect.objectContaining({
          businessName: 'My Biz',
          daysLeft: 1,
        }),
        'user-1',
      );
    });

    it('should not fail when sendEmail throws', async () => {
      const sub = {
        id: 'sub-1',
        businessId: 'biz-1',
        userId: 'user-1',
        user: { email: 'test@test.com', fullName: 'Test' },
        plan: { name: 'Basic' },
      };
      (subscriptionsService.getExpiringSubscriptions as jest.Mock).mockResolvedValue([sub]);
      dataSource.manager.query.mockResolvedValue([{ name: 'My Biz' }]);
      (notificationsService.sendEmail as jest.Mock).mockRejectedValue(new Error('SMTP fail'));

      // Should not throw — errors are caught with .catch()
      await expect(service.send1DayExpiryReminders()).resolves.toBeUndefined();
    });
  });

  // ─── RETRY FAILED NOTIFICATIONS ───────────────────────────────
  describe('retryFailedNotifications', () => {
    it('should delegate to notificationsService.retryFailed', async () => {
      await service.retryFailedNotifications();

      expect(notificationsService.retryFailed).toHaveBeenCalled();
    });
  });

  // ─── CLEANUP REFRESH TOKENS ───────────────────────────────────
  describe('cleanupRefreshTokens', () => {
    it('should delete expired and revoked tokens', async () => {
      refreshTokenRepo.delete
        .mockResolvedValueOnce({ affected: 5 }) // expired
        .mockResolvedValueOnce({ affected: 3 }); // revoked

      await service.cleanupRefreshTokens();

      expect(refreshTokenRepo.delete).toHaveBeenCalledTimes(2);
      // First call for expired tokens
      expect(refreshTokenRepo.delete).toHaveBeenCalledWith(
        expect.objectContaining({ expiresAt: expect.anything() }),
      );
      // Second call for revoked tokens
      expect(refreshTokenRepo.delete).toHaveBeenCalledWith({ isRevoked: true });
    });
  });

  // ─── CLEANUP NOTIFICATION LOGS ─────────────────────────────────
  describe('cleanupNotificationLogs', () => {
    it('should delegate to notificationsService.cleanupOldLogs with 90 days', async () => {
      await service.cleanupNotificationLogs();

      expect(notificationsService.cleanupOldLogs).toHaveBeenCalledWith(90);
    });
  });
});
