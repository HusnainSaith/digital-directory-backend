import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MailerService } from '@nestjs-modules/mailer';
import { NotificationLog, NotificationChannel, NotificationStatus } from './entities/notification-log.entity';
import { NotificationType } from '../../common/enums/notification-type.enum';
import { ServiceResponse } from '../../common/interfaces/service-response.interface';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(NotificationLog)
    private readonly notificationLogRepository: Repository<NotificationLog>,
    private readonly mailerService: MailerService,
  ) {}

  /**
   * Maps legacy template names + context to the unified notification template format.
   */
  private mapToUnifiedContext(templateName: string, ctx: Record<string, any>): Record<string, any> {
    const base = { year: new Date().getFullYear(), name: ctx.name || ctx.recipientName };

    const map: Record<string, () => Record<string, any>> = {
      'verify-email': () => ({
        heading: 'Verify Your Email',
        headingColor: '#0ea5e9', headingColorEnd: '#6366f1', icon: '✉️',
        paragraphs: ['Thank you for registering. Please verify your email address to get started.'],
        buttonText: 'Verify Email Address', buttonUrl: ctx.verificationUrl, buttonColor: '#0ea5e9',
        footerNote: `This link will expire in ${ctx.expiresIn || '24 hours'}. If you didn't create an account, you can safely ignore this email.`,
      }),
      'welcome': () => ({
        heading: 'Welcome Aboard!',
        headingColor: '#10b981', headingColorEnd: '#0ea5e9', icon: '🎉',
        paragraphs: ['Your email has been verified successfully. You can now start using all the features of Digital Directory.'],
        buttonText: 'Go to Dashboard', buttonUrl: ctx.loginUrl, buttonColor: '#0ea5e9',
      }),
      'password-reset': () => ({
        heading: 'Password Reset Request',
        headingColor: '#f59e0b', headingColorEnd: '#ef4444', icon: '🔐',
        paragraphs: ['We received a request to reset your password. Click the button below to set a new password:'],
        buttonText: 'Reset Password', buttonUrl: ctx.resetUrl, buttonColor: '#ef4444',
        footerNote: "This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.",
      }),
      'listing-approved': () => ({
        heading: 'Your Listing is Live!',
        headingColor: '#16a34a', headingColorEnd: '#10b981', icon: '🎊',
        paragraphs: [
          `Great news! Your business listing <strong>${ctx.businessName || ''}</strong> has been approved and is now visible in the Digital Directory.`,
          'Potential customers can now discover your business through search and browsing.',
        ],
        ...(ctx.listingUrl ? { buttonText: 'View Your Listing', buttonUrl: ctx.listingUrl, buttonColor: '#16a34a' } : {}),
      }),
      'listing-rejected': () => ({
        heading: 'Business Listing Update',
        headingColor: '#ef4444', headingColorEnd: '#dc2626', icon: '📋',
        paragraphs: [
          `We regret to inform you that your business listing <strong>${ctx.businessName || ''}</strong> has been rejected.`,
          ...(ctx.reason ? [`<strong>Reason:</strong> ${ctx.reason}`] : []),
          'Please review the feedback and update your listing before resubmitting for approval.',
        ],
        footerNote: 'If you believe this was a mistake, please contact our support team.',
      }),
      'subscription-confirmation': () => ({
        heading: 'Subscription Confirmed!',
        headingColor: '#0ea5e9', headingColorEnd: '#6366f1', icon: '✅',
        paragraphs: [`Your subscription to the <strong>${ctx.planName || ''}</strong> plan has been activated.`],
        details: [
          { label: 'Business', value: ctx.businessName },
          { label: 'Plan', value: ctx.planName },
          { label: 'Billing', value: ctx.billingCycle },
          { label: 'Next Billing', value: ctx.nextBillingDate },
        ].filter((d: { value: string }) => d.value),
        buttonText: 'Go to Dashboard', buttonUrl: ctx.dashboardUrl, buttonColor: '#0ea5e9',
      }),
      'payment-receipt': () => ({
        heading: 'Payment Receipt',
        headingColor: '#10b981', headingColorEnd: '#059669', icon: '🧾',
        paragraphs: ['Thank you for your payment. Here are your transaction details:'],
        details: [
          { label: 'Business', value: ctx.businessName },
          { label: 'Plan', value: ctx.planName },
          { label: 'Amount', value: ctx.amount ? `${ctx.amount} ${ctx.currency || ''}` : undefined },
          { label: 'Payment Date', value: ctx.paymentDate },
          { label: 'Reference', value: ctx.referenceId },
          { label: 'Billing Period', value: ctx.periodStart ? `${ctx.periodStart} — ${ctx.periodEnd}` : undefined },
          { label: 'Next Billing', value: ctx.nextBillingDate },
        ].filter((d: { value: string }) => d.value),
        ...(ctx.invoiceUrl
          ? { buttonText: 'Download Invoice (PDF)', buttonUrl: ctx.invoiceUrl, buttonColor: '#059669' }
          : { buttonText: 'Go to Dashboard', buttonUrl: ctx.dashboardUrl, buttonColor: '#0ea5e9' }),
        footerNote: 'This is an automated receipt. If you have questions about this charge, please contact our support team.',
      }),
      'payment-failed': () => ({
        heading: 'Payment Failed',
        headingColor: '#ef4444', headingColorEnd: '#dc2626', icon: '⚠️',
        paragraphs: [
          `We were unable to process the payment for your business listing <strong>${ctx.businessName || ''}</strong>.`,
          'Please update your payment details to avoid any service disruption. If your subscription remains unpaid, your listing may be deactivated.',
        ],
      }),
      'subscription-expiry-reminder': () => ({
        heading: 'Subscription Expiring Soon',
        headingColor: '#f59e0b', headingColorEnd: '#f97316', icon: '⏰',
        paragraphs: [
          `Your <strong>${ctx.planName || ''}</strong> subscription for <strong>${ctx.businessName || ''}</strong> will expire in <strong>${ctx.daysLeft || ''} day(s)</strong>.`,
          'To continue enjoying all the features, please ensure your payment method is up to date.',
        ],
        buttonText: 'Manage Subscription', buttonUrl: ctx.dashboardUrl, buttonColor: '#f59e0b',
      }),
      'subscription-expired': () => ({
        heading: 'Subscription Expired',
        headingColor: '#ef4444', headingColorEnd: '#dc2626', icon: '🔴',
        paragraphs: [
          `Your <strong>${ctx.planName || ''}</strong> subscription for <strong>${ctx.businessName || ''}</strong> has expired.`,
          'Your business listing has been deactivated and is no longer visible to the public. To reactivate your listing, please renew your subscription.',
        ],
        buttonText: 'Renew Subscription', buttonUrl: ctx.dashboardUrl, buttonColor: '#ef4444',
      }),
      'new-listing-submitted': () => ({
        heading: 'New Listing Pending Review',
        headingColor: '#6366f1', headingColorEnd: '#8b5cf6', icon: '📝',
        paragraphs: [
          `A new business listing <strong>${ctx.businessName || ''}</strong> has been submitted and is pending your review.`,
          'Please log in to the admin panel to approve or reject this listing.',
        ],
      }),
      'admin-password-reset': () => ({
        heading: 'Your Password Has Been Reset',
        headingColor: '#0ea5e9', headingColorEnd: '#6366f1', icon: '🔑',
        paragraphs: [
          'An administrator has reset your password.',
          ...(ctx.tempPassword
            ? ['Your temporary password is:']
            : ['Your new password has been set by the administrator. Please contact them if you need your credentials.']),
        ],
        ...(ctx.tempPassword ? { highlight: ctx.tempPassword } : {}),
        footerNote: ctx.tempPassword
          ? 'Please log in and change your password immediately for security purposes.'
          : 'If you did not expect this change, please contact support immediately.',
      }),
      'broadcast': () => ({
        heading: ctx.subject || 'Announcement',
        headingColor: '#0ea5e9', headingColorEnd: '#6366f1', icon: '📢',
        rawHtml: ctx.content,
      }),
    };

    const builder = map[templateName];
    return builder ? { ...base, ...builder() } : { ...base, ...ctx };
  }

  /**
   * Send an email using the unified notification template and log the result.
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
      const unifiedContext = this.mapToUnifiedContext(templateName, context);
      await this.mailerService.sendMail({
        to: recipient,
        subject,
        template: 'notification',
        context: unifiedContext,
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
    const failedLogs = await this.notificationLogRepository.find({
      where: {
        status: NotificationStatus.FAILED,
        channel: NotificationChannel.EMAIL,
      },
      order: { createdAt: 'ASC' },
      take: 50,
    });

    const retryable = failedLogs.filter(
      (log) => log.recipientEmail && log.templateName && log.subject,
    );

    let retried = 0;
    for (const log of retryable) {
      try {
        const unifiedContext = this.mapToUnifiedContext(
          log.templateName,
          log.contextData || {},
        );

        await this.mailerService.sendMail({
          to: log.recipientEmail,
          subject: log.subject,
          template: 'notification',
          context: unifiedContext,
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
