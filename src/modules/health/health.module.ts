import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { StripeHealthIndicator } from './indicators/stripe.health';
import { R2HealthIndicator } from './indicators/r2.health';
import { MailHealthIndicator } from './indicators/mail.health';

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
  providers: [StripeHealthIndicator, R2HealthIndicator, MailHealthIndicator],
})
export class HealthModule {}
