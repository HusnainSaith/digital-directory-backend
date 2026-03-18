import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { AdminService } from './admin.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminResetPasswordDto } from './dto/admin-reset-password.dto';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleEnum } from '../roles/role.enum';
import { SecurityUtil } from '../../common/utils/security.util';
import { NotificationStatus } from '../../common/enums/notification-type.enum';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { BaseController } from '../../common/controllers/base.controller';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleEnum.SUPER_ADMIN)
@ApiBearerAuth('JWT-auth')
export class AdminController extends BaseController {
  constructor(
    private readonly adminService: AdminService,
    private readonly notificationsService: NotificationsService,
    private readonly auditLogsService: AuditLogsService,
  ) {
    super();
  }

  // --- Businesses ---

  @Get('businesses')
  @ApiOperation({ summary: 'List all businesses with filters' })
  @ApiResponse({ status: 200, description: 'Business listings retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'isApproved', required: false, type: Boolean })
  listBusinesses(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('isApproved') isApproved?: boolean,
  ) {
    return this.handleAsyncOperation(
      this.adminService.listBusinesses({ page, limit, search, isApproved }),
    );
  }

  @Get('businesses/:id')
  @ApiOperation({ summary: 'Get business detail with all relations' })
  @ApiResponse({ status: 200, description: 'Business detail retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Business not found' })
  getBusinessDetail(@Param('id') id: string) {
    const validId = SecurityUtil.validateId(id);
    return this.handleAsyncOperation(this.adminService.getBusinessDetail(validId));
  }

  @Patch('businesses/:id/approve')
  @ApiOperation({ summary: 'Approve business listing' })
  @ApiResponse({ status: 200, description: 'Business listing approved successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Business not found' })
  approveBusiness(@Param('id') id: string) {
    const validId = SecurityUtil.validateId(id);
    return this.handleAsyncOperation(this.adminService.approveBusiness(validId));
  }

  @Patch('businesses/:id/reject')
  @ApiOperation({ summary: 'Reject business listing' })
  @ApiResponse({ status: 200, description: 'Business listing rejected successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Business not found' })
  rejectBusiness(
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    const validId = SecurityUtil.validateId(id);
    return this.handleAsyncOperation(
      this.adminService.rejectBusiness(validId, reason || 'No reason provided'),
    );
  }

  @Patch('businesses/:id/suspend')
  @ApiOperation({ summary: 'Suspend an approved business listing' })
  @ApiResponse({ status: 200, description: 'Business suspended successfully' })
  @ApiResponse({ status: 404, description: 'Business not found' })
  suspendBusiness(@Param('id') id: string) {
    const validId = SecurityUtil.validateId(id);
    return this.handleAsyncOperation(this.adminService.suspendBusiness(validId));
  }

  @Patch('businesses/:id/reinstate')
  @ApiOperation({ summary: 'Reinstate a suspended business listing' })
  @ApiResponse({ status: 200, description: 'Business reinstated successfully' })
  @ApiResponse({ status: 404, description: 'Business not found' })
  reinstateBusiness(@Param('id') id: string) {
    const validId = SecurityUtil.validateId(id);
    return this.handleAsyncOperation(this.adminService.reinstateBusiness(validId));
  }

  // --- Users ---

  @Get('users')
  @ApiOperation({ summary: 'List all users with filters' })
  @ApiResponse({ status: 200, description: 'Users list retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  listUsers(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('isActive') isActive?: boolean,
  ) {
    return this.handleAsyncOperation(
      this.adminService.listUsers({ page, limit, search, isActive }),
    );
  }

  @Post('users/:id/deactivate')
  @ApiOperation({ summary: 'Deactivate a user' })
  @ApiResponse({ status: 200, description: 'User deactivated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'User not found' })
  deactivateUser(@Param('id') id: string) {
    const validId = SecurityUtil.validateId(id);
    return this.handleAsyncOperation(this.adminService.suspendUser(validId));
  }

  @Patch('users/:id/reinstate')
  @ApiOperation({ summary: 'Reinstate a suspended user' })
  @ApiResponse({ status: 200, description: 'User reinstated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'User not found' })
  reinstateUser(@Param('id') id: string) {
    const validId = SecurityUtil.validateId(id);
    return this.handleAsyncOperation(this.adminService.reinstateUser(validId));
  }

  @Delete('users/:id')
  @ApiOperation({ summary: 'Permanently delete a user and all associated data' })
  @ApiResponse({ status: 200, description: 'User permanently deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'User not found' })
  deleteUser(@Param('id') id: string) {
    const validId = SecurityUtil.validateId(id);
    return this.handleAsyncOperation(this.adminService.deleteUser(validId));
  }

  @Patch('users/:id/reset-password')
  @ApiOperation({ summary: 'Reset a user password (admin)' })
  @ApiResponse({ status: 200, description: 'User password reset successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'User not found' })
  resetUserPassword(
    @Param('id') id: string,
    @Body() dto: AdminResetPasswordDto,
  ) {
    const validId = SecurityUtil.validateId(id);
    return this.handleAsyncOperation(
      this.adminService.resetUserPassword(validId, dto.newPassword),
    );
  }

  // --- Reviews ---

  @Get('payments')
  @ApiOperation({ summary: 'List all payments with filters' })
  @ApiResponse({ status: 200, description: 'Payments list retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'countryId', required: false, type: String })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  listPayments(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('countryId') countryId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.handleAsyncOperation(
      this.adminService.listPayments({ page, limit, status, countryId, dateFrom, dateTo }),
    );
  }

  @Get('subscriptions')
  @ApiOperation({ summary: 'List all subscriptions with filters' })
  @ApiResponse({ status: 200, description: 'Subscriptions list retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'countryId', required: false, type: String })
  listSubscriptions(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('countryId') countryId?: string,
  ) {
    return this.handleAsyncOperation(
      this.adminService.listSubscriptions({ page, limit, status, countryId }),
    );
  }

  // --- Reviews (Moderation) ---

  @Get('reviews')
  @ApiOperation({ summary: 'List all reviews with filters' })
  @ApiResponse({ status: 200, description: 'Reviews list retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'businessId', required: false, type: String })
  listReviews(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('businessId') businessId?: string,
  ) {
    return this.handleAsyncOperation(
      this.adminService.listReviews({ page, limit, businessId }),
    );
  }

  @Delete('reviews/:id')
  @ApiOperation({ summary: 'Delete a review (moderation)' })
  @ApiResponse({ status: 200, description: 'Review deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Review not found' })
  deleteReview(@Param('id') id: string) {
    const validId = SecurityUtil.validateId(id);
    return this.handleAsyncOperation(this.adminService.deleteReview(validId));
  }

  // --- Subscription Plans CRUD ---

  @Get('plans')
  @ApiOperation({ summary: 'List all subscription plans (including inactive)' })
  @ApiResponse({ status: 200, description: 'Plans retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getAllPlans(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.handleAsyncOperation(this.adminService.getAllPlans(page, limit));
  }

  @Post('plans')
  @ApiOperation({ summary: 'Create a subscription plan' })
  @ApiResponse({ status: 201, description: 'Subscription plan created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  createPlan(@Body() dto: CreatePlanDto) {
    return this.handleAsyncOperation(this.adminService.createPlan(dto));
  }

  @Patch('plans/:id')
  @ApiOperation({ summary: 'Update a subscription plan' })
  @ApiResponse({ status: 200, description: 'Subscription plan updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Subscription plan not found' })
  updatePlan(@Param('id') id: string, @Body() dto: UpdatePlanDto) {
    const validId = SecurityUtil.validateId(id);
    return this.handleAsyncOperation(this.adminService.updatePlan(validId, dto));
  }

  @Delete('plans/:id')
  @ApiOperation({ summary: 'Delete a subscription plan' })
  @ApiResponse({ status: 200, description: 'Subscription plan deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Subscription plan not found' })
  deletePlan(@Param('id') id: string) {
    const validId = SecurityUtil.validateId(id);
    return this.handleAsyncOperation(this.adminService.deletePlan(validId));
  }

  // --- Notifications ---

  @Post('notifications/broadcast')
  @ApiOperation({ summary: 'Broadcast notification to all users, by country, or individual' })
  @ApiResponse({ status: 201, description: 'Notification broadcast sent successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  broadcastNotification(
    @Body('subject') subject: string,
    @Body('content') content: string,
    @Body('countryId') countryId?: string,
    @Body('userId') userId?: string,
  ) {
    return this.handleAsyncOperation(
      this.adminService.broadcastNotification(subject, content, countryId, userId),
    );
  }

  @Get('notifications/logs')
  @ApiOperation({ summary: 'Get notification logs' })
  @ApiResponse({ status: 200, description: 'Notification logs retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: NotificationStatus })
  getNotificationLogs(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: NotificationStatus,
  ) {
    return this.handleAsyncOperation(
      this.notificationsService.getLogs(page, limit, status),
    );
  }

  @Post('notifications/retry-failed')
  @ApiOperation({ summary: 'Retry all failed notification deliveries' })
  @ApiResponse({ status: 200, description: 'Failed notifications retried' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  retryFailedNotifications() {
    return this.handleAsyncOperation(
      this.notificationsService.retryFailed().then((count) => ({
        success: true,
        message: `Retried ${count} failed notifications`,
        data: { retriedCount: count },
      })),
    );
  }

  // --- Analytics ---

  @Get('dashboard')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(30000)
  @ApiOperation({ summary: 'Dashboard analytics (optionally by country)' })
  @ApiResponse({ status: 200, description: 'Dashboard analytics retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiQuery({ name: 'countryId', required: false, type: String })
  getAnalytics(@Query('countryId') countryId?: string) {
    return this.handleAsyncOperation(this.adminService.getAnalytics(countryId));
  }

  @Get('recent-activity')
  @ApiOperation({ summary: 'Get recent audit log activity for dashboard' })
  @ApiResponse({ status: 200, description: 'Recent activity retrieved' })
  getRecentActivity() {
    return this.handleAsyncOperation(
      this.auditLogsService.findAll({ page: 1, limit: 10 }),
    );
  }

  @Get('analytics/revenue')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(30000)
  @ApiOperation({ summary: 'Revenue analytics by month' })
  @ApiResponse({ status: 200, description: 'Revenue analytics retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'countryId', required: false, type: String })
  getRevenueAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('countryId') countryId?: string,
  ) {
    return this.handleAsyncOperation(
      this.adminService.getRevenueAnalytics(startDate, endDate, countryId),
    );
  }

  // --- Audit Logs ---

  @Get('audit-logs')
  @ApiOperation({ summary: 'Get audit logs with filters' })
  @ApiResponse({ status: 200, description: 'Audit logs retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'action', required: false, type: String })
  @ApiQuery({ name: 'resource', required: false, type: String })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  getAuditLogs(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('userId') userId?: string,
    @Query('action') action?: string,
    @Query('resource') resource?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.handleAsyncOperation(
      this.auditLogsService.findAll({ page, limit, userId, action, resource, dateFrom, dateTo }),
    );
  }
}
