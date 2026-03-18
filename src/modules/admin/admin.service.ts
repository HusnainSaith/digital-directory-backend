import {
  Injectable,
  NotFoundException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { Business } from '../businesses/entities/business.entity';
import { User } from '../users/entities/user.entity';
import { RefreshToken } from '../auth/entities/refresh-token.entity';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { Payment } from '../payments/entities/payment.entity';
import { Review } from '../reviews/entities/review.entity';
import { SubscriptionPlan } from '../subscriptions/entities/subscription-plan.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { ServiceResponse } from '../../common/interfaces/service-response.interface';
import { BCRYPT_SALT_ROUNDS } from '../../common/constants/security.constants';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectRepository(Business)
    private readonly businessRepository: Repository<Business>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    @InjectRepository(SubscriptionPlan)
    private readonly planRepository: Repository<SubscriptionPlan>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async approveBusiness(id: string): Promise<ServiceResponse<Business>> {
    const business = await this.businessRepository.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!business) throw new NotFoundException('Business not found');

    business.isApproved = true;
    business.rejectionReason = null;
    const saved = await this.businessRepository.save(business);
    if (business.user?.email) {
      await this.notificationsService
        .sendEmail(
          'listing-approved',
          business.user.email,
          'Your business has been approved!',
          {
            recipientName: business.user?.name || 'Business Owner',
            businessName: business.name,
            listingUrl: `${process.env.FRONTEND_URLS?.split(',')[0] || ''}/business/${business.id}`,
          },
        )
        .catch(() => {});
    }

    return { success: true, message: 'Business approved', data: saved };
  }

  async rejectBusiness(
    id: string,
    reason: string,
  ): Promise<ServiceResponse<Business>> {
    const business = await this.businessRepository.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!business) throw new NotFoundException('Business not found');

    business.isApproved = false;
    business.rejectionReason = reason || null;
    const saved = await this.businessRepository.save(business);

    // Send rejection notification
    if (business.user?.email) {
      await this.notificationsService
        .sendEmail(
          'listing-rejected',
          business.user.email,
          'Business listing rejected',
          {
            subject: 'Business Listing Rejected',
            recipientName: business.user?.name || 'Business Owner',
            businessName: business.name,
            reason,
          },
        )
        .catch(() => {});
    }

    return { success: true, message: 'Business rejected', data: saved };
  }

  async suspendBusiness(id: string): Promise<ServiceResponse<Business>> {
    const business = await this.businessRepository.findOne({ where: { id } });
    if (!business) throw new NotFoundException('Business not found');

    business.isActive = false;
    const saved = await this.businessRepository.save(business);
    this.logger.log(`Business suspended: ${business.name}`);
    return { success: true, message: 'Business suspended', data: saved };
  }

  async reinstateBusiness(id: string): Promise<ServiceResponse<Business>> {
    const business = await this.businessRepository.findOne({ where: { id } });
    if (!business) throw new NotFoundException('Business not found');

    business.isActive = true;
    const saved = await this.businessRepository.save(business);
    this.logger.log(`Business reinstated: ${business.name}`);
    return { success: true, message: 'Business reinstated', data: saved };
  }

  async suspendUser(id: string): Promise<ServiceResponse<void>> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['role'],
    });
    if (!user) throw new NotFoundException('User not found');

    if (user.role?.name === 'admin' || user.role?.name === 'super_admin') {
      throw new ForbiddenException('Admin users cannot be deactivated');
    }

    user.isActive = false;
    await this.userRepository.save(user);

    // Revoke all refresh tokens
    await this.refreshTokenRepository.update(
      { userId: id },
      { isRevoked: true },
    );

    this.logger.log(`User suspended: ${user.email}`);
    return { success: true, message: 'User suspended' };
  }

  async reinstateUser(id: string): Promise<ServiceResponse<void>> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    user.isActive = true;
    await this.userRepository.save(user);

    this.logger.log(`User reinstated: ${user.email}`);
    return { success: true, message: 'User reinstated' };
  }

  async deleteUser(id: string): Promise<ServiceResponse<void>> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    // Cascade cleanup: delete related data in the correct order
    // 1. Find user's businesses
    const businesses = await this.businessRepository.find({
      where: { userId: id },
    });
    if (businesses.length > 0) {
      const businessIds = businesses.map((e) => e.id);

      // 2. Fetch all subscriptions for all businesses in one query
      const subscriptions = await this.subscriptionRepository
        .createQueryBuilder('s')
        .select('s.id')
        .where('s.business_id IN (:...ids)', { ids: businessIds })
        .getMany();

      if (subscriptions.length > 0) {
        const subscriptionIds = subscriptions.map((s) => s.id);
        // Delete all payments for those subscriptions in one query
        await this.paymentRepository
          .createQueryBuilder()
          .delete()
          .where('subscription_id IN (:...ids)', { ids: subscriptionIds })
          .execute();
        // Delete all subscriptions in one query
        await this.subscriptionRepository
          .createQueryBuilder()
          .delete()
          .where('id IN (:...ids)', { ids: subscriptionIds })
          .execute();
      }

      // 3. Delete reviews on user's businesses in one query
      await this.reviewRepository
        .createQueryBuilder()
        .delete()
        .where('business_id IN (:...ids)', { ids: businessIds })
        .execute();

      // 4. Delete user's businesses (cascade children: socials, hours, images, services, products, branches, categories)
      await this.businessRepository.delete({ userId: id });
    }

    // 5. Delete reviews written by this user (on other businesses)
    await this.reviewRepository.delete({ userId: id });

    // 6. Delete refresh tokens
    await this.refreshTokenRepository.delete({ userId: id });

    // 7. Finally delete the user (user_permissions cascades automatically)
    await this.userRepository.delete(id);

    this.logger.log(`User permanently deleted: ${user.email} (${id})`);
    return { success: true, message: 'User permanently deleted' };
  }

  async resetUserPassword(
    userId: string,
    newPassword?: string,
  ): Promise<ServiceResponse<{ tempPassword?: string }>> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const password = newPassword || crypto.randomBytes(8).toString('hex');
    const hashed = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    await this.userRepository.update(userId, { passwordHash: hashed });

    // Revoke all refresh tokens so user must re-login
    await this.refreshTokenRepository.update({ userId }, { isRevoked: true });

    // Send notification email with admin-specific template
    await this.notificationsService
      .sendEmail(
        'admin-password-reset',
        user.email,
        'Your password has been reset',
        {
          name: user.name || user.email,
          tempPassword: newPassword ? undefined : password,
        },
        userId,
      )
      .catch(() => {});

    this.logger.log(`Password reset by admin for user: ${user.email}`);

    return {
      success: true,
      message: 'Password reset successfully',
      data: newPassword ? {} : { tempPassword: password },
    };
  }

  async getAnalytics(countryId?: string): Promise<ServiceResponse<any>> {
    // Base queries — scoped to country if provided
    const businessWhere: any = {};
    if (countryId) businessWhere.countryId = countryId;

    const [
      totalUsers,
      totalBusinesses,
      approvedBusinesses,
      pendingApprovals,
      activeSubscriptions,
      totalRevenue,
      totalReviews,
      totalPayments,
    ] = await Promise.all([
      this.userRepository.count(),
      this.businessRepository.count({ where: businessWhere }),
      this.businessRepository.count({
        where: { ...businessWhere, isApproved: true },
      }),
      this.businessRepository.count({
        where: {
          ...businessWhere,
          isApproved: false,
          rejectionReason: null as any,
        },
      }),
      countryId
        ? this.subscriptionRepository
            .createQueryBuilder('s')
            .innerJoin('businesses', 'e', 'e.id = s.business_id')
            .andWhere('s.status = :activeStatus', { activeStatus: 'active' })
            .andWhere('e.country_id = :countryId', { countryId })
            .getCount()
        : this.subscriptionRepository.count({
            where: { status: 'active' as any },
          }),
      countryId
        ? this.paymentRepository
            .createQueryBuilder('payment')
            .innerJoin('subscriptions', 's', 's.id = payment.subscription_id')
            .innerJoin('businesses', 'e', 'e.id = s.business_id')
            .select('COALESCE(SUM(payment.amount), 0)', 'total')
            .andWhere('payment.status = :payStatus', { payStatus: 'success' })
            .andWhere('e.country_id = :countryId', { countryId })
            .getRawOne()
        : this.paymentRepository
            .createQueryBuilder('payment')
            .select('COALESCE(SUM(payment.amount), 0)', 'total')
            .where('payment.status = :status', { status: 'success' })
            .getRawOne(),
      this.reviewRepository.count(),
      this.paymentRepository.count(),
    ]);

    // Country breakdown (always include)
    const businessesByCountry = await this.businessRepository
      .createQueryBuilder('e')
      .innerJoin('countries', 'c', 'c.id = e.country_id')
      .select('e.country_id', 'countryId')
      .addSelect('c.name', 'countryName')
      .addSelect('COUNT(e.id)', 'total')
      .addSelect(
        'SUM(CASE WHEN e.is_approved = true THEN 1 ELSE 0 END)',
        'approved',
      )
      .addSelect(
        'SUM(CASE WHEN e.is_active = true THEN 1 ELSE 0 END)',
        'active',
      )
      .groupBy('e.country_id')
      .addGroupBy('c.name')
      .getRawMany();

    // Revenue by country
    const revenueByCountryRaw = await this.paymentRepository
      .createQueryBuilder('payment')
      .innerJoin('subscriptions', 's', 's.id = payment.subscription_id')
      .innerJoin('businesses', 'e', 'e.id = s.business_id')
      .innerJoin('countries', 'c', 'c.id = e.country_id')
      .select('c.name', 'country')
      .addSelect('COALESCE(SUM(payment.amount), 0)', 'revenue')
      .where('payment.status = :status', { status: 'success' })
      .groupBy('c.name')
      .orderBy('COALESCE(SUM(payment.amount), 0)', 'DESC')
      .getRawMany();

    const revenueByCountry: Record<string, number> = {};
    for (const row of revenueByCountryRaw) {
      revenueByCountry[row.country] = parseFloat(row.revenue || '0');
    }

    // Subscription conversion rate
    const approvedCount = approvedBusinesses || 1;
    const subscriptionConversionRate = Number(
      ((Number(activeSubscriptions) / approvedCount) * 100).toFixed(2),
    );

    return {
      success: true,
      message: 'Analytics retrieved',
      data: {
        totalUsers,
        totalBusinesses,
        approvedBusinesses,
        pendingApprovals,
        activeSubscriptions,
        totalRevenue: parseFloat(totalRevenue?.total || '0'),
        totalReviews,
        totalPayments,
        subscriptionConversionRate,
        businessesByCountry,
        revenueByCountry,
      },
    };
  }

  async getRevenueAnalytics(
    startDate?: string,
    endDate?: string,
    countryId?: string,
  ): Promise<ServiceResponse<any>> {
    const qb = this.paymentRepository
      .createQueryBuilder('payment')
      .select("DATE_TRUNC('month', payment.created_at)", 'month')
      .addSelect('SUM(payment.amount)', 'revenue')
      .addSelect('COUNT(*)', 'count')
      .where('payment.status = :status', { status: 'success' });

    if (countryId) {
      qb.innerJoin('subscriptions', 's', 's.id = payment.subscription_id')
        .innerJoin('businesses', 'e', 'e.id = s.business_id')
        .andWhere('e.country_id = :countryId', { countryId });
    }

    if (startDate) {
      qb.andWhere('payment.created_at >= :startDate', { startDate });
    }
    if (endDate) {
      qb.andWhere('payment.created_at <= :endDate', { endDate });
    }

    qb.groupBy("DATE_TRUNC('month', payment.created_at)").orderBy(
      "DATE_TRUNC('month', payment.created_at)",
      'ASC',
    );

    const monthlyData = await qb.getRawMany();

    // Payment volume by country
    const paymentVolumeByCountry = await this.paymentRepository
      .createQueryBuilder('payment')
      .innerJoin('subscriptions', 's', 's.id = payment.subscription_id')
      .innerJoin('businesses', 'e', 'e.id = s.business_id')
      .innerJoin('countries', 'c', 'c.id = e.country_id')
      .select('e.country_id', 'countryId')
      .addSelect('c.name', 'countryName')
      .addSelect('SUM(payment.amount)', 'totalAmount')
      .addSelect('COUNT(*)', 'count')
      .where('payment.status = :status', { status: 'success' })
      .groupBy('e.country_id')
      .addGroupBy('c.name')
      .getRawMany();

    return {
      success: true,
      message: 'Revenue analytics retrieved',
      data: { monthly: monthlyData, paymentVolumeByCountry },
    };
  }

  async broadcastNotification(
    subject: string,
    content: string,
    countryId?: string,
    userId?: string,
  ): Promise<ServiceResponse<{ sent: number; failed: number }>> {
    let users: { id: string; email: string; name: string }[];

    if (userId) {
      // Individual user targeting
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) throw new NotFoundException('User not found');
      users = [{ id: user.id, email: user.email, name: user.name }];
    } else if (countryId) {
      // Find business owners with businesses in the specified country
      const businesses = await this.businessRepository.find({
        where: { countryId },
        relations: ['user'],
        select: ['id', 'userId'],
      });

      const ownerMap = new Map<
        string,
        { id: string; email: string; name: string }
      >();
      for (const e of businesses) {
        if (e.user && e.user.isActive && !ownerMap.has(e.user.id)) {
          ownerMap.set(e.user.id, {
            id: e.user.id,
            email: e.user.email,
            name: e.user.name,
          });
        }
      }
      users = Array.from(ownerMap.values());
    } else {
      users = await this.userRepository.find({
        where: { isActive: true },
        select: ['id', 'email', 'name'],
      });
    }

    const recipients = users.map((u) => ({
      email: u.email,
      userId: u.id,
      name: u.name,
    }));

    const totalRecipients = recipients.length;

    // Fire-and-forget — do not await so the response returns immediately
    this.notificationsService
      .sendBroadcast(subject, 'broadcast', { subject, content }, recipients)
      .catch((err) => this.logger.error(`Broadcast error: ${err.message}`));

    return {
      success: true,
      message: 'Broadcast queued',
      data: { sent: totalRecipients, failed: 0 },
    };
  }

  // --- List / Filter endpoints ---

  async listPayments(query?: {
    page?: number;
    limit?: number;
    status?: string;
    countryId?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<ServiceResponse<Payment[]>> {
    const page = query?.page || 1;
    const limit = Math.min(100, Math.max(1, query?.limit || 20));

    const qb = this.paymentRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.subscription', 'subscription')
      .leftJoinAndSelect('subscription.plan', 'plan')
      .leftJoinAndSelect('subscription.business', 'business')
      .leftJoinAndSelect('business.user', 'user');

    if (query?.status) {
      qb.andWhere('payment.status = :status', { status: query.status });
    }
    if (query?.countryId) {
      qb.innerJoin(
        'businesses',
        'biz',
        'biz.id = subscription.business_id',
      ).andWhere('biz.country_id = :countryId', { countryId: query.countryId });
    }
    if (query?.dateFrom) {
      qb.andWhere('payment.created_at >= :dateFrom', {
        dateFrom: query.dateFrom,
      });
    }
    if (query?.dateTo) {
      qb.andWhere('payment.created_at <= :dateTo', { dateTo: query.dateTo });
    }

    qb.orderBy('payment.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return {
      success: true,
      message: 'Payments retrieved',
      data,
      meta: { total, page, limit },
    };
  }

  async listSubscriptions(query?: {
    page?: number;
    limit?: number;
    status?: string;
    countryId?: string;
  }): Promise<ServiceResponse<Subscription[]>> {
    const page = query?.page || 1;
    const limit = Math.min(100, Math.max(1, query?.limit || 20));

    const qb = this.subscriptionRepository
      .createQueryBuilder('subscription')
      .leftJoinAndSelect('subscription.plan', 'plan')
      .leftJoinAndSelect('subscription.business', 'business')
      .leftJoinAndSelect('business.user', 'user');

    if (query?.status) {
      qb.andWhere('subscription.status = :status', { status: query.status });
    }
    if (query?.countryId) {
      qb.andWhere('business.countryId = :countryId', {
        countryId: query.countryId,
      });
    }

    qb.orderBy('subscription.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return {
      success: true,
      message: 'Subscriptions retrieved',
      data,
      meta: { total, page, limit },
    };
  }

  async getBusinessDetail(id: string): Promise<ServiceResponse<Business>> {
    const business = await this.businessRepository.findOne({
      where: { id },
      relations: [
        'category',
        'user',
        'countryEntity',
        'cityEntity',
        'socials',
        'businessHours',
        'services',
        'products',
        'branches',
        'reviews',
        'reviews.user',
      ],
    });
    if (!business) throw new NotFoundException('Business not found');
    return {
      success: true,
      message: 'Business detail retrieved',
      data: business,
    };
  }

  async listBusinesses(query?: {
    page?: number;
    limit?: number;
    search?: string;
    isApproved?: boolean;
  }): Promise<ServiceResponse<Business[]>> {
    const page = query?.page || 1;
    const limit = Math.min(100, Math.max(1, query?.limit || 20));
    const where: any = {};

    if (query?.isApproved !== undefined) where.isApproved = query.isApproved;
    if (query?.search) where.name = ILike(`%${query.search}%`);

    const [data, total] = await this.businessRepository.findAndCount({
      where,
      relations: ['category', 'user'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      success: true,
      message: 'Businesses retrieved',
      data,
      meta: { total, page, limit },
    };
  }

  async listUsers(query?: {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
  }): Promise<ServiceResponse<User[]>> {
    const page = query?.page || 1;
    const limit = Math.min(100, Math.max(1, query?.limit || 20));

    const qb = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .select([
        'user.id',
        'user.email',
        'user.name',
        'user.isActive',
        'user.isVerified',
        'user.createdAt',
        'role.id',
        'role.name',
      ]);

    if (query?.search) {
      qb.andWhere('(user.email ILIKE :search OR user.name ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }
    if (query?.isActive !== undefined) {
      qb.andWhere('user.isActive = :isActive', { isActive: query.isActive });
    }

    qb.orderBy('user.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return {
      success: true,
      message: 'Users retrieved',
      data,
      meta: { total, page, limit },
    };
  }

  async listReviews(query?: {
    page?: number;
    limit?: number;
    businessId?: string;
  }): Promise<ServiceResponse<Review[]>> {
    const page = query?.page || 1;
    const limit = Math.min(100, Math.max(1, query?.limit || 20));
    const where: any = {};

    if (query?.businessId) where.businessId = query.businessId;

    const [data, total] = await this.reviewRepository.findAndCount({
      where,
      relations: ['business', 'user'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      success: true,
      message: 'Reviews retrieved',
      data,
      meta: { total, page, limit },
    };
  }

  // --- Subscription Plans CRUD ---

  async createPlan(
    dto: Partial<SubscriptionPlan>,
  ): Promise<ServiceResponse<SubscriptionPlan>> {
    const plan = this.planRepository.create(dto);
    const saved = await this.planRepository.save(plan);
    return { success: true, message: 'Plan created', data: saved };
  }

  async getAllPlans(
    page?: number,
    limit?: number,
  ): Promise<ServiceResponse<SubscriptionPlan[]>> {
    const p = Math.max(1, page || 1);
    const l = Math.min(100, Math.max(1, limit || 20));
    const [data, total] = await this.planRepository.findAndCount({
      order: { isActive: 'DESC', name: 'ASC' },
      skip: (p - 1) * l,
      take: l,
    });
    return {
      success: true,
      message: 'Plans retrieved',
      data,
      meta: { total, page: p, limit: l },
    };
  }

  async updatePlan(
    id: string,
    dto: Partial<SubscriptionPlan>,
  ): Promise<ServiceResponse<SubscriptionPlan>> {
    const plan = await this.planRepository.findOne({ where: { id } });
    if (!plan) throw new NotFoundException('Plan not found');
    Object.assign(plan, dto);
    const saved = await this.planRepository.save(plan);
    return { success: true, message: 'Plan updated', data: saved };
  }

  async deletePlan(id: string): Promise<ServiceResponse<void>> {
    const plan = await this.planRepository.findOne({ where: { id } });
    if (!plan) throw new NotFoundException('Plan not found');
    // Soft-deactivate instead of hard-delete to preserve FK references from existing subscriptions
    plan.isActive = false;
    await this.planRepository.save(plan);
    return { success: true, message: 'Plan deactivated' };
  }

  async deleteReview(id: string): Promise<ServiceResponse<void>> {
    const review = await this.reviewRepository.findOne({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');

    await this.reviewRepository.remove(review);

    return { success: true, message: 'Review deleted' };
  }
}
