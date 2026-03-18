import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailHealthIndicator extends HealthIndicator {
  constructor(private readonly mailerService: MailerService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      // Verify the SMTP transport is configured and can connect
      const transporter = (this.mailerService as any).transporter;
      if (transporter?.verify) {
        await transporter.verify();
      }
      return this.getStatus(key, true);
    } catch (error) {
      throw new HealthCheckError(
        'Mail service health check failed',
        this.getStatus(key, false, { message: error.message }),
      );
    }
  }
}
