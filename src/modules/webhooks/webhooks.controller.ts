import {
  Controller,
  Post,
  Req,
  Headers,
  BadRequestException,
  Logger,
  RawBodyRequest,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiExcludeEndpoint, ApiResponse } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhooksController {
  private readonly stripe: Stripe;
  private readonly webhookSecret: string;
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly configService: ConfigService,
  ) {
    const stripeKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    this.stripe = new Stripe(stripeKey || '', { apiVersion: '2025-02-24.acacia' as any });
    this.webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET', '');
  }

  @Post('stripe')
  @ApiOperation({ summary: 'Stripe webhook handler (signature-verified)' })
  @ApiResponse({ status: 200, description: 'Webhook event processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid webhook signature or missing body' })
  @ApiExcludeEndpoint()
  async handleStripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    let event: Stripe.Event;

    try {
      const rawBody = req.rawBody;
      if (!rawBody) {
        throw new BadRequestException('Missing raw body');
      }
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        this.webhookSecret,
      );
    } catch (err) {
      this.logger.error(`Webhook signature verification failed: ${err.message}`);
      throw new BadRequestException('Invalid webhook signature');
    }

    this.logger.log(`Received Stripe event: ${event.type}`);

    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await this.subscriptionsService.handleCheckoutCompleted(
            event.data.object as Stripe.Checkout.Session,
          );
          break;

        case 'invoice.payment_succeeded':
          await this.subscriptionsService.handleInvoicePaid(
            event.data.object as Stripe.Invoice,
          );
          break;

        case 'invoice.payment_failed':
          await this.subscriptionsService.handleInvoiceFailed(
            event.data.object as Stripe.Invoice,
          );
          break;

        case 'customer.subscription.deleted':
          await this.subscriptionsService.handleSubscriptionDeleted(
            event.data.object as Stripe.Subscription,
          );
          break;

        default:
          this.logger.log(`Unhandled event type: ${event.type}`);
      }
    } catch (err) {
      this.logger.error(`Error handling webhook event ${event.type}: ${err.message}`, err.stack);
      // Return 200 to Stripe even on error to prevent retries for known events
    }

    return { received: true };
  }
}
