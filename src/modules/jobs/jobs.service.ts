import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, LessThan } from 'typeorm';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RefreshToken } from '../auth/entities/refresh-token.entity';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly notificationsService: NotificationsService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Daily at 1:00 AM — Check for expired subscriptions
   */
  @Cron('0 1 * * *')
  async checkExpiredSubscriptions(): Promise<void> {
    this.logger.log('Running: checkExpiredSubscriptions');
    const count = await this.subscriptionsService.checkExpiredSubscriptions();
    this.logger.log(`Expired subscriptions marked: ${count}`);
  }

  /**
   * Daily at 9:00 AM — Send 7-day expiry reminders
   */
  @Cron('0 9 * * *')
  async send7DayExpiryReminders(): Promise<void> {
    this.logger.log('Running: send7DayExpiryReminders');
    // Get subscriptions expiring between 6 and 7 days from now to avoid overlap with 1-day reminder
    const expiring = await this.subscriptionsService.getExpiringSubscriptions(7);
    const oneDayFromNow = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000);

    const filtered = expiring.filter(
      (sub) => new Date(sub.endDate) > oneDayFromNow,
    );

    // Send all 7-day reminders in parallel
    await Promise.all(
      filtered
        .filter((sub) => !!sub.business?.user?.email)
        .map((sub) => {
          const daysLeft = Math.ceil(
            (new Date(sub.endDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000),
          );
          const businessName = sub.business?.name || 'Your business';
          return this.notificationsService.sendEmail(
            'subscription-expiry-reminder',
            sub.business.user.email,
            `Your subscription expires in ${daysLeft} days`,
            {
              name: sub.business.user.name || sub.business.user.email,
              planName: sub.plan?.name || 'Your plan',
              businessName,
              daysLeft,
              dashboardUrl: `${process.env.FRONTEND_URLS?.split(',')[0] || ''}/dashboard`,
            },
            sub.business?.userId,
          ).catch((err) => this.logger.error(`Failed to send 7-day reminder: ${err.message}`));
        }),
    );

    this.logger.log(`7-day reminders sent: ${filtered.length}`);
  }

  /**
   * Daily at 10:00 AM — Send 1-day expiry reminders (separate schedule from 7-day)
   */
  @Cron('0 10 * * *')
  async send1DayExpiryReminders(): Promise<void> {
    this.logger.log('Running: send1DayExpiryReminders');
    const expiring = await this.subscriptionsService.getExpiringSubscriptions(1);

    // Send all 1-day reminders in parallel
    await Promise.all(
      expiring
        .filter((sub) => !!sub.business?.user?.email)
        .map((sub) => {
          const businessName = sub.business?.name || 'Your business';
          return this.notificationsService.sendEmail(
            'subscription-expiry-reminder',
            sub.business.user.email,
            'Your subscription expires tomorrow!',
            {
              name: sub.business.user.name || sub.business.user.email,
              planName: sub.plan?.name || 'Your plan',
              businessName,
              daysLeft: 1,
              dashboardUrl: `${process.env.FRONTEND_URLS?.split(',')[0] || ''}/dashboard`,
            },
            sub.business?.userId,
          ).catch((err) => this.logger.error(`Failed to send 1-day reminder: ${err.message}`));
        }),
    );

    this.logger.log(`1-day reminders sent: ${expiring.length}`);
  }

  /**
   * Every 30 minutes — Retry failed notifications
   */
  @Cron('*/30 * * * *')
  async retryFailedNotifications(): Promise<void> {
    this.logger.log('Running: retryFailedNotifications');
    const retried = await this.notificationsService.retryFailed();
    this.logger.log(`Failed notifications retried: ${retried}`);
  }

  /**
   * Daily at 2:00 AM — Clean up expired/revoked refresh tokens
   */
  @Cron('0 2 * * *')
  async cleanupRefreshTokens(): Promise<void> {
    this.logger.log('Running: cleanupRefreshTokens');
    const result = await this.refreshTokenRepository.delete({
      expiresAt: LessThan(new Date()),
    });
    const revokedResult = await this.refreshTokenRepository.delete({
      isRevoked: true,
    });
    const total = (result.affected || 0) + (revokedResult.affected || 0);
    this.logger.log(`Refresh tokens cleaned up: ${total}`);
  }

  /**
   * Weekly on Sunday at 3:00 AM — Clean up old notification logs (> 90 days)
   */
  @Cron('0 3 * * 0')
  async cleanupNotificationLogs(): Promise<void> {
    this.logger.log('Running: cleanupNotificationLogs');
    const cleaned = await this.notificationsService.cleanupOldLogs(90);
    this.logger.log(`Notification logs cleaned up: ${cleaned}`);
  }
}
