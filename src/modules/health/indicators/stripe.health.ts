import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeHealthIndicator extends HealthIndicator {
  private readonly stripe: Stripe;

  constructor(private readonly configService: ConfigService) {
    super();
    const stripeKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    this.stripe = new Stripe(stripeKey || '', { apiVersion: '2025-02-24.acacia' as any });
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      // Quick, lightweight API call to verify Stripe connectivity
      await this.stripe.balance.retrieve();
      return this.getStatus(key, true);
    } catch (error) {
      throw new HealthCheckError(
        'Stripe health check failed',
        this.getStatus(key, false, { message: error.message }),
      );
    }
  }
}
