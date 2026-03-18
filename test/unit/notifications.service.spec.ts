import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MailerService } from '@nestjs-modules/mailer';
import { NotificationsService } from '../../src/modules/notifications/notifications.service';
import { NotificationLog } from '../../src/modules/notifications/entities/notification-log.entity';
import { NotificationStatus } from '../../src/modules/notifications/entities/notification-log.entity';
import { mockRepository } from '../utils/test-helpers';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let notificationLogRepo: ReturnType<typeof mockRepository>;
  let mailerService: Partial<MailerService>;

  beforeEach(async () => {
    notificationLogRepo = mockRepository();
    mailerService = {
      sendMail: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: getRepositoryToken(NotificationLog), useValue: notificationLogRepo },
        { provide: MailerService, useValue: mailerService },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  describe('sendEmail', () => {
    it('should send email and log as SENT', async () => {
      notificationLogRepo.create.mockReturnValue({
        status: NotificationStatus.PENDING,
      });
      notificationLogRepo.save.mockResolvedValue({});

      await service.sendEmail('broadcast', 'test@test.com', 'Test Subject', { foo: 'bar' });

      expect(mailerService.sendMail).toHaveBeenCalledWith({
        to: 'test@test.com',
        subject: 'Test Subject',
        template: 'broadcast',
        context: { foo: 'bar' },
      });
      expect(notificationLogRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: NotificationStatus.SENT }),
      );
    });

    it('should log as FAILED when mailer throws', async () => {
      notificationLogRepo.create.mockReturnValue({
        status: NotificationStatus.PENDING,
      });
      notificationLogRepo.save.mockResolvedValue({});
      (mailerService.sendMail as jest.Mock).mockRejectedValue(new Error('SMTP error'));

      await service.sendEmail('broadcast', 'test@test.com', 'Test Subject', {});

      expect(notificationLogRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: NotificationStatus.FAILED,
          errorMessage: 'SMTP error',
        }),
      );
    });

    it('should include userId if provided', async () => {
      notificationLogRepo.create.mockReturnValue({ status: NotificationStatus.PENDING });
      notificationLogRepo.save.mockResolvedValue({});

      await service.sendEmail('broadcast', 'test@test.com', 'Subject', {}, 'user-123');

      expect(notificationLogRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-123' }),
      );
    });
  });

  describe('sendBroadcast', () => {
    it('should send to all recipients and count results', async () => {
      notificationLogRepo.create.mockReturnValue({ status: NotificationStatus.PENDING });
      notificationLogRepo.save.mockResolvedValue({});

      const recipients = [
        { email: 'a@a.com', userId: 'u1', name: 'A' },
        { email: 'b@b.com', userId: 'u2', name: 'B' },
      ];

      const result = await service.sendBroadcast('Subject', 'broadcast', { content: 'Hi' }, recipients);

      expect(result.sent).toBe(2);
      expect(result.failed).toBe(0);
      expect(mailerService.sendMail).toHaveBeenCalledTimes(2);
    });

    it('should count failures', async () => {
      notificationLogRepo.create.mockReturnValue({ status: NotificationStatus.PENDING });
      notificationLogRepo.save.mockImplementation((log: any) => {
        if (log.status === NotificationStatus.FAILED) throw new Error('save failed');
        return Promise.resolve(log);
      });
      (mailerService.sendMail as jest.Mock)
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('fail'));

      const recipients = [
        { email: 'a@a.com', name: 'A' },
        { email: 'b@b.com', name: 'B' },
      ];

      const result = await service.sendBroadcast('Subject', 'broadcast', {}, recipients);

      expect(result.sent).toBe(1);
      expect(result.failed).toBe(1);
    });
  });

  describe('getLogs', () => {
    it('should return paginated logs', async () => {
      const logs = [{ id: '1' }, { id: '2' }];
      notificationLogRepo.findAndCount.mockResolvedValue([logs, 2]);

      const result = await service.getLogs(1, 20);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(logs);
      expect(result.meta.total).toBe(2);
    });

    it('should filter by status', async () => {
      notificationLogRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.getLogs(1, 10, NotificationStatus.FAILED);

      expect(notificationLogRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: NotificationStatus.FAILED },
        }),
      );
    });
  });

  describe('cleanupOldLogs', () => {
    it('should delete old logs and return count', async () => {
      const mockQb = {
        delete: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 5 }),
      };
      notificationLogRepo.createQueryBuilder.mockReturnValue(mockQb as any);

      const result = await service.cleanupOldLogs(30);

      expect(result).toBe(5);
    });
  });
});
