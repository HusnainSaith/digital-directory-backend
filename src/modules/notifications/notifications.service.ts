import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MailerService } from '@nestjs-modules/mailer';
import { NotificationLog, NotificationChannel, NotificationStatus } from './entities/notification-log.entity';
import { NotificationType } from '../../common/enums/notification-type.enum';
import { ServiceResponse } from '../../common/interfaces/service-response.interface';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(NotificationLog)
    private readonly notificationLogRepository: Repository<NotificationLog>,
    private readonly mailerService: MailerService,
  ) {}

  /**
   * Send an email using a template and log the result.
   */
  async sendEmail(
    templateName: string,
    recipient: string,
    subject: string,
    context: Record<string, any>,
    userId?: string,
  ): Promise<void> {
    const log = this.notificationLogRepository.create({
      userId,
      type: NotificationType.EMAIL,
      channel: NotificationChannel.EMAIL,
      status: NotificationStatus.PENDING,
      recipientEmail: recipient,
      subject,
      templateName,
      contextData: context,
    });

    try {
      await this.mailerService.sendMail({
        to: recipient,
        subject,
        template: templateName,
        context,
      });

      log.status = NotificationStatus.SENT;
      log.sentAt = new Date();
      this.logger.log(`Email sent to ${recipient}: ${subject}`);
    } catch (error) {
      log.status = NotificationStatus.FAILED;
      log.errorMessage = error.message;
      this.logger.error(`Failed to send email to ${recipient}: ${error.message}`, error.stack);
    }

    await this.notificationLogRepository.save(log);
  }

  /**
   * Send a broadcast email to multiple recipients.
   */
  async sendBroadcast(
    subject: string,
    templateName: string,
    context: Record<string, any>,
    recipients: Array<{ email: string; userId?: string; name?: string }>,
  ): Promise<{ sent: number; failed: number }> {
    // Send all emails in parallel instead of sequentially to avoid blocking
    // the caller for O(N) SMTP round-trips.
    const results = await Promise.allSettled(
      recipients.map((recipient) =>
        this.sendEmail(
          templateName,
          recipient.email,
          subject,
          { ...context, recipientName: recipient.name },
          recipient.userId,
        ),
      ),
    );

    const sent = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    this.logger.log(`Broadcast complete: ${sent} sent, ${failed} failed`);
    return { sent, failed };
  }

  /**
   * Log an in-app activity notification (non-email, fire-and-forget).
   * Used by sub-resource services (socials, hours, services, products, branches)
   * to track create / update / delete operations in the notifications_log table.
   */
  async logActivity(
    userId: string,
    activityType: string,
    resourceId: string,
  ): Promise<void> {
    try {
      const log = this.notificationLogRepository.create({
        userId,
        type: activityType,
        channel: NotificationChannel.IN_APP,
        status: NotificationStatus.SENT,
        sentAt: new Date(),
      });
      await this.notificationLogRepository.save(log);
    } catch (err) {
      this.logger.error(`Failed to log activity [${activityType}] for resource ${resourceId}: ${err.message}`);
    }
  }

  /**
   * Retry failed notifications by resending emails.
   * Only retries entries that have stored template/recipient data.
   */
  async retryFailed(): Promise<number> {
    // Find failed email notifications that have retry data
    const failedLogs = await this.notificationLogRepository.find({
      where: {
        status: NotificationStatus.FAILED,
        channel: NotificationChannel.EMAIL,
      },
      order: { createdAt: 'ASC' },
      take: 50,
    });

    // Filter to only those that have stored recipient/template data for retry
    const retryable = failedLogs.filter(
      (log) => log.recipientEmail && log.templateName && log.subject,
    );

    let retried = 0;
    for (const log of retryable) {
      try {
        // Verify template file exists before attempting to send to avoid crashing the process
        const templateDir = path.join(__dirname, 'templates');
        const templateFile = path.join(templateDir, `${log.templateName}.hbs`);
        if (!fs.existsSync(templateFile)) {
          log.errorMessage = `Template not found: ${log.templateName}`;
          this.logger.warn(`Skipping retry for notification ${log.id}: template '${log.templateName}' not found`);
          await this.notificationLogRepository.save(log);
          continue;
        }

        await this.mailerService.sendMail({
          to: log.recipientEmail,
          subject: log.subject,
          template: log.templateName,
          context: log.contextData || {},
        });

        log.status = NotificationStatus.SENT;
        log.sentAt = new Date();
        log.errorMessage = null;
        retried++;
        this.logger.log(`Retry succeeded for notification ${log.id} to ${log.recipientEmail}`);
      } catch (err) {
        log.errorMessage = `Retry failed: ${err.message}`;
        this.logger.warn(`Retry failed for notification ${log.id}: ${err.message}`);
      }
      await this.notificationLogRepository.save(log);
    }

    // Also mark stale pending entries (no retry data) as failed
    const staleResult = await this.notificationLogRepository
      .createQueryBuilder()
      .update()
      .set({ status: NotificationStatus.FAILED })
      .where('status = :status', { status: NotificationStatus.PENDING })
      .andWhere('sent_at IS NULL')
      .andWhere('recipient_email IS NULL')
      .execute();

    const staleAffected = staleResult.affected || 0;
    if (staleAffected > 0) {
      this.logger.log(`Marked ${staleAffected} stale pending notifications as failed`);
    }

    if (retried > 0) {
      this.logger.log(`Retried ${retried} of ${retryable.length} failed notifications`);
    }

    return retried;
  }

  /**
   * Get paginated notification logs.
   */
  async getLogs(
    page: number = 1,
    limit: number = 20,
    status?: NotificationStatus,
  ): Promise<ServiceResponse<NotificationLog[]>> {
    const where: any = {};
    if (status) where.status = status;

    const [logs, total] = await this.notificationLogRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      relations: ['user'],
    });

    return {
      success: true,
      message: 'Notification logs retrieved',
      data: logs,
      meta: { total, page, limit },
    };
  }

  /**
   * Clean up notification logs older than the specified number of days.
   */
  async cleanupOldLogs(daysOld: number): Promise<number> {
    const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
    const result = await this.notificationLogRepository
      .createQueryBuilder()
      .delete()
      .where('created_at < :cutoff', { cutoff })
      .execute();
    return result.affected || 0;
  }
}
