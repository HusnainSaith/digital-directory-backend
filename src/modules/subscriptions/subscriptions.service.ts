import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, Between, In } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { SubscriptionPlan } from './entities/subscription-plan.entity';
import { Subscription, SubscriptionStatus } from './entities/subscription.entity';
import { Payment, PaymentStatus } from '../payments/entities/payment.entity';
import { Business } from '../businesses/entities/business.entity';
import { User } from '../users/entities/user.entity';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { ServiceResponse } from '../../common/interfaces/service-response.interface';
import { NotificationsService } from '../notifications/notifications.service';
import { InvoiceService, InvoiceData } from '../../common/services/invoice.service';

@Injectable()
export class SubscriptionsService {
  private readonly stripe: Stripe;
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    @InjectRepository(SubscriptionPlan)
    private readonly planRepository: Repository<SubscriptionPlan>,
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Business)
    private readonly businessRepository: Repository<Business>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
    private readonly notificationsService: NotificationsService,
    private readonly invoiceService: InvoiceService,
  ) {
    const stripeKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    this.stripe = new Stripe(stripeKey || '', { apiVersion: '2025-02-24.acacia' as any });
  }

  async listPlans(): Promise<ServiceResponse<SubscriptionPlan[]>> {
    const plans = await this.planRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
    return { success: true, message: 'Subscription plans retrieved', data: plans };
  }

  async createCheckoutSession(
    userId: string,
    email: string,
    dto: CreateCheckoutDto,
  ): Promise<ServiceResponse<{ sessionUrl: string }>> {
    const plan = await this.planRepository.findOne({ where: { id: dto.planId, isActive: true } });
    if (!plan) {
      throw new NotFoundException('Subscription plan not found');
    }

    if (!plan.stripePriceId) {
      throw new BadRequestException('Stripe price is not configured for the selected plan');
    }

    const frontendUrl = this.configService.get<string>('FRONTEND_URLS', 'http://localhost:3000').split(',')[0];

    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: plan.stripePriceId, quantity: 1 }],
      customer_email: email,
      metadata: {
        userId,
        planId: dto.planId,
        businessId: dto.businessId,
      },
      success_url: `${frontendUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/subscription/cancel`,
    });

    return {
      success: true,
      message: 'Checkout session created',
      data: { sessionUrl: session.url! },
    };
  }

  async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const { userId, planId, businessId } = session.metadata || {};
    if (!userId || !planId || !businessId) {
      this.logger.warn('Checkout session missing metadata');
      return;
    }

    const stripeSubscription = await this.stripe.subscriptions.retrieve(
      session.subscription as string,
    );

    const subscription = this.subscriptionRepository.create({
      planId,
      businessId,
      stripeSubscriptionId: stripeSubscription.id,
      status: SubscriptionStatus.ACTIVE,
      autoRenew: true,
      startDate: new Date((stripeSubscription as any).current_period_start * 1000),
      endDate: new Date((stripeSubscription as any).current_period_end * 1000),
    });
    await this.subscriptionRepository.save(subscription);

    // Reactivate the business listing
    await this.businessRepository.update(businessId, { isActive: true });

    // Record payment
    const payment = this.paymentRepository.create({
      subscriptionId: subscription.id,
      amount: (session.amount_total || 0) / 100,
      currency: session.currency || 'usd',
      status: PaymentStatus.SUCCESS,
      stripePaymentIntent: (session.payment_intent as string) || session.id,
    });
    await this.paymentRepository.save(payment);

    // Send subscription confirmation email
    try {
      const plan = await this.planRepository.findOne({ where: { id: planId } });
      const business = await this.businessRepository.findOne({ where: { id: businessId } });
      const user = await this.userRepository.findOne({ where: { id: userId } });
      const periodEndDate = new Date((stripeSubscription as any).current_period_end * 1000);
      if (session.customer_email || user?.email) {
        await this.notificationsService.sendEmail(
          'subscription-confirmation',
          session.customer_email || user.email,
          'Subscription Confirmed!',
          {
            name: user?.name || 'Business Owner',
            planName: plan?.name || 'Subscription',
            businessName: business?.name || 'Your business',
            nextBillingDate: periodEndDate.toLocaleDateString(),
            dashboardUrl: `${process.env.FRONTEND_URLS?.split(',')[0] || ''}/dashboard`,
          },
          userId,
        );
      }
    } catch (err) {
      this.logger.warn(`Failed to send subscription confirmation email: ${err.message}`);
    }

    // Notify admin users about new listing pending review (SRS §10.1 Step 10)
    try {
      const business = await this.businessRepository.findOne({ where: { id: businessId } });
      if (business) {
        this.notifyAdminsNewListing(business.name);
      }
    } catch (err) {
      this.logger.warn(`Failed to notify admins of new listing: ${err.message}`);
    }

    // Send payment receipt
    const checkoutUser = await this.userRepository.findOne({ where: { id: userId } });
    if (checkoutUser?.email) {
      this.sendPaymentReceipt({
        email: checkoutUser.email,
        name: checkoutUser.name || 'Business Owner',
        businessId,
        planId,
        amount: (session.amount_total || 0) / 100,
        currency: session.currency || 'usd',
        referenceId: (session.payment_intent as string) || session.id,
        periodStart: new Date((stripeSubscription as any).current_period_start * 1000),
        periodEnd: new Date((stripeSubscription as any).current_period_end * 1000),
      }).catch(() => {});
    }

    this.logger.log(`Subscription created for user ${userId}, business ${businessId}`);
  }

  async handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
    const stripeSubId = (invoice as any).subscription as string;
    const subscription = await this.subscriptionRepository.findOne({
      where: { stripeSubscriptionId: stripeSubId },
    });

    if (!subscription) {
      this.logger.warn(`Subscription not found for Stripe subscription: ${stripeSubId}`);
      return;
    }

    // Update period dates
    const line = invoice.lines?.data?.[0];
    if (line?.period) {
      subscription.startDate = new Date(line.period.start * 1000);
      subscription.endDate = new Date(line.period.end * 1000);
    }
    subscription.status = SubscriptionStatus.ACTIVE;
    await this.subscriptionRepository.save(subscription);

    // Reactivate the business if it was deactivated due to expiry (SRS §10.3 Step 5)
    await this.businessRepository.update(subscription.businessId, { isActive: true });

    // Record payment
    const payment = this.paymentRepository.create({
      subscriptionId: subscription.id,
      amount: (invoice.amount_paid || 0) / 100,
      currency: invoice.currency || 'usd',
      status: PaymentStatus.SUCCESS,
      stripePaymentIntent: (invoice as any).payment_intent as string || invoice.id,
    });
    await this.paymentRepository.save(payment);

    // Send payment receipt for renewal
    const business = await this.businessRepository.findOne({ where: { id: subscription.businessId } });
    const renewalUser = business?.userId
      ? await this.userRepository.findOne({ where: { id: business.userId } })
      : null;
    if (renewalUser?.email) {
      this.sendPaymentReceipt({
        email: renewalUser.email,
        name: renewalUser.name || 'Business Owner',
        businessId: subscription.businessId,
        planId: subscription.planId,
        amount: (invoice.amount_paid || 0) / 100,
        currency: invoice.currency || 'usd',
        referenceId: invoice.id,
        periodStart: subscription.startDate,
        periodEnd: subscription.endDate,
      }).catch(() => {});
    }
  }

  async handleInvoiceFailed(invoice: Stripe.Invoice): Promise<void> {
    const stripeSubId = (invoice as any).subscription as string;
    const subscription = await this.subscriptionRepository.findOne({
      where: { stripeSubscriptionId: stripeSubId },
    });

    if (!subscription) return;

    subscription.status = SubscriptionStatus.EXPIRED;
    await this.subscriptionRepository.save(subscription);

    // Send payment failure email
    const business = await this.businessRepository.findOne({ where: { id: subscription.businessId } });
    const failedUser = business?.userId
      ? await this.userRepository.findOne({ where: { id: business.userId } })
      : null;
    if (failedUser?.email) {
      try {
        await this.notificationsService.sendEmail(
          'payment-failed',
          failedUser.email,
          'Payment Failed — Action Required',
          {
            recipientName: failedUser.name || 'Business Owner',
            businessName: business?.name || 'your business',
          },
          failedUser.id,
        );
      } catch (err) {
        this.logger.warn(`Failed to send payment failure email: ${err.message}`);
      }
    }

    this.logger.warn(`Payment failed for subscription ${subscription.id}`);
  }

  async handleSubscriptionDeleted(stripeSubscription: Stripe.Subscription): Promise<void> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { stripeSubscriptionId: stripeSubscription.id },
    });

    if (!subscription) return;

    subscription.status = SubscriptionStatus.CANCELLED;
    await this.subscriptionRepository.save(subscription);

    this.logger.log(`Subscription canceled: ${subscription.id}`);
  }

  async getStatus(userId: string): Promise<ServiceResponse<Subscription[]>> {
    const businesses = await this.businessRepository.find({ where: { userId }, select: ['id'] });
    if (!businesses.length) {
      return { success: true, message: 'Subscription status retrieved', data: [] };
    }
    const businessIds = businesses.map((b) => b.id);
    const subscriptions = await this.subscriptionRepository.find({
      where: { businessId: In(businessIds) },
      relations: ['plan'],
      order: { createdAt: 'DESC' },
    });
    return { success: true, message: 'Subscription status retrieved', data: subscriptions };
  }

  async getBusinessStatus(businessId: string, userId: string): Promise<ServiceResponse<Subscription | null>> {
    // Verify the user owns this business
    const business = await this.businessRepository.findOne({ where: { id: businessId, userId } });
    if (!business) {
      throw new NotFoundException('Business not found');
    }
    const subscription = await this.subscriptionRepository.findOne({
      where: { businessId },
      relations: ['plan'],
      order: { createdAt: 'DESC' },
    });
    return {
      success: true,
      message: subscription ? 'Subscription found' : 'No subscription found',
      data: subscription || null,
    };
  }

  async cancel(userId: string, subscriptionId: string): Promise<ServiceResponse<void>> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id: subscriptionId },
      relations: ['business'],
    });
    if (!subscription || subscription.business?.userId !== userId) {
      throw new NotFoundException('Subscription not found');
    }

    if (subscription.stripeSubscriptionId) {
      await this.stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });
    }

    subscription.autoRenew = false;
    await this.subscriptionRepository.save(subscription);
    this.notificationsService.logActivity(userId, 'subscription_cancelled', subscriptionId).catch(() => {});

    return { success: true, message: 'Subscription will be canceled at the end of the billing period' };
  }

  async toggleAutoRenew(
    userId: string,
    subscriptionId: string,
    autoRenew: boolean,
  ): Promise<ServiceResponse<Subscription>> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id: subscriptionId },
      relations: ['business'],
    });
    if (!subscription || subscription.business?.userId !== userId) {
      throw new NotFoundException('Subscription not found');
    }
    if (subscription.status !== SubscriptionStatus.ACTIVE) {
      throw new BadRequestException('Can only toggle auto-renew on active subscriptions');
    }

    // Sync with Stripe
    if (subscription.stripeSubscriptionId) {
      await this.stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: !autoRenew,
      });
    }

    subscription.autoRenew = autoRenew;
    const saved = await this.subscriptionRepository.save(subscription);
    this.notificationsService.logActivity(userId, 'subscription_autorenew_toggled', subscriptionId).catch(() => {});

    return {
      success: true,
      message: `Auto-renew ${autoRenew ? 'enabled' : 'disabled'}`,
      data: saved,
    };
  }

  /**
   * Cron job: check for expired subscriptions
   */
  async checkExpiredSubscriptions(): Promise<number> {
    const expired = await this.subscriptionRepository.find({
      where: {
        status: SubscriptionStatus.ACTIVE,
        endDate: LessThan(new Date()),
      },
    });

    for (const sub of expired) {
      sub.status = SubscriptionStatus.EXPIRED;
      await this.subscriptionRepository.save(sub);

      // Deactivate the business listing
      if (sub.businessId) {
        await this.businessRepository.update(sub.businessId, { isActive: false });
      }

      // Send subscription expired email
      try {
        const business = await this.businessRepository.findOne({ where: { id: sub.businessId } });
        const user = business?.userId
          ? await this.userRepository.findOne({ where: { id: business.userId } })
          : null;
        if (user?.email) {
          const plan = sub.planId ? await this.planRepository.findOne({ where: { id: sub.planId } }) : null;
          await this.notificationsService.sendEmail(
            'subscription-expired',
            user.email,
            'Your Subscription Has Expired',
            {
              name: user.name || 'Business Owner',
              planName: plan?.name || 'Your plan',
              businessName: business?.name || 'your business',
              daysLeft: 0,
              dashboardUrl: `${process.env.FRONTEND_URLS?.split(',')[0] || ''}/dashboard`,
            },
            user.id,
          );
        }
      } catch (err) {
        this.logger.warn(`Failed to send expiry email for sub ${sub.id}: ${err.message}`);
      }
    }

    if (expired.length > 0) {
      this.logger.log(`Marked ${expired.length} subscriptions as expired`);
    }

    return expired.length;
  }

  /**
   * Get subscriptions expiring within given days
   */
  async getExpiringSubscriptions(daysFromNow: number): Promise<Subscription[]> {
    const now = new Date();
    const future = new Date(now.getTime() + daysFromNow * 24 * 60 * 60 * 1000);

    return this.subscriptionRepository.find({
      where: {
        status: SubscriptionStatus.ACTIVE,
        endDate: Between(now, future),
      },
      relations: ['plan', 'business', 'business.user'],
    });
  }

  private notifyAdminsNewListing(businessName: string): void {
    // Fire-and-forget — do not block the calling request
    (async () => {
      try {
        const allUsers = await this.userRepository.find({ relations: ['role'] });
        const adminUsers = allUsers.filter(
          (u) => u.role?.name === 'admin' || u.role?.name === 'super_admin',
        );
        // Send all admin notifications in parallel instead of sequentially
        await Promise.all(
          adminUsers.map((admin) =>
            this.notificationsService.sendEmail(
              'new-listing-submitted',
              admin.email,
              `New Business Listing: ${businessName}`,
              { recipientName: admin.name, businessName },
              admin.id,
            ).catch((err) => this.logger.warn(`Failed to notify admin ${admin.email}: ${err.message}`)),
          ),
        );
      } catch (err) {
        this.logger.warn(`Failed to notify admins of new listing: ${err.message}`);
      }
    })();
  }

  private async sendPaymentReceipt(params: {
    email: string;
    name: string;
    businessId: string;
    planId?: string;
    amount: number;
    currency: string;
    referenceId: string;
    periodStart: Date;
    periodEnd: Date;
  }): Promise<void> {
    try {
      const business = await this.businessRepository.findOne({ where: { id: params.businessId } });
      const plan = params.planId ? await this.planRepository.findOne({ where: { id: params.planId } }) : null;

      const businessName = business?.name || 'Your business';
      const planName = plan?.name || 'Subscription';
      const invoiceNumber = `INV-${Date.now()}-${params.referenceId.slice(-6).toUpperCase()}`;

      // Generate PDF invoice and upload to R2
      let invoiceUrl: string | undefined;
      try {
        const invoiceData: InvoiceData = {
          invoiceNumber,
          date: new Date().toLocaleDateString(),
          companyName: 'Digital Directory',
          companyEmail: this.configService.get<string>('MAIL_FROM', 'noreply@labverse.org'),
          customerName: params.name,
          customerEmail: params.email,
          businessName,
          items: [
            {
              description: `${planName} — ${businessName}`,
              quantity: 1,
              unitPrice: params.amount,
              amount: params.amount,
            },
          ],
          subtotal: params.amount,
          total: params.amount,
          currency: params.currency,
          referenceId: params.referenceId,
          billingPeriod: `${params.periodStart.toLocaleDateString()} — ${params.periodEnd.toLocaleDateString()}`,
          notes: 'Thank you for subscribing to Digital Directory. This invoice serves as your payment receipt.',
        };
        invoiceUrl = await this.invoiceService.generateAndUpload(invoiceData);
        // Persist invoice URL on the payment record for later retrieval
        if (invoiceUrl) {
          await this.paymentRepository.update(
            { stripePaymentIntent: params.referenceId },
            { invoiceUrl },
          );
        }
      } catch (err) {
        this.logger.warn(`Failed to generate PDF invoice: ${err.message}`);
      }

      await this.notificationsService.sendEmail(
        'payment-receipt',
        params.email,
        'Payment Receipt — Digital Directory',
        {
          name: params.name,
          businessName,
          planName,
          amount: params.amount.toFixed(2),
          currency: params.currency.toUpperCase(),
          paymentDate: new Date().toLocaleDateString(),
          referenceId: params.referenceId,
          periodStart: params.periodStart.toLocaleDateString(),
          periodEnd: params.periodEnd.toLocaleDateString(),
          nextBillingDate: params.periodEnd.toLocaleDateString(),
          dashboardUrl: `${process.env.FRONTEND_URLS?.split(',')[0] || ''}/dashboard`,
          invoiceUrl,
        },
      );
    } catch (err) {
      this.logger.warn(`Failed to send payment receipt: ${err.message}`);
    }
  }
}
