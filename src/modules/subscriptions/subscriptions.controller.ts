import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { BaseController } from '../../common/controllers/base.controller';
import { SecurityUtil } from '../../common/utils/security.util';

@ApiTags('Subscriptions')
@Controller('subscriptions')
export class SubscriptionsController extends BaseController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {
    super();
  }

  @Get('plans')
  @ApiOperation({ summary: 'List all active subscription plans' })
  @ApiResponse({ status: 200, description: 'Subscription plans retrieved successfully' })
  listPlans() {
    return this.handleAsyncOperation(this.subscriptionsService.listPlans());
  }

  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create Stripe checkout session' })
  @ApiResponse({ status: 201, description: 'Checkout session created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  createCheckout(@Req() req: any, @Body() dto: CreateCheckoutDto) {
    return this.handleAsyncOperation(
      this.subscriptionsService.createCheckoutSession(req.user.id, req.user.email, dto),
    );
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current user subscription status' })
  @ApiResponse({ status: 200, description: 'Subscription status retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getStatus(@Req() req: any) {
    return this.handleAsyncOperation(this.subscriptionsService.getStatus(req.user.id));
  }

  @Get('my/:businessId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get subscription status for a business' })
  @ApiResponse({ status: 200, description: 'Business subscription status retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Business not found' })
  getBusinessStatus(@Req() req: any, @Param('businessId') businessId: string) {
    const validId = SecurityUtil.validateId(businessId);
    return this.handleAsyncOperation(
      this.subscriptionsService.getBusinessStatus(validId, req.user.id),
    );
  }

  @Patch('cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Cancel subscription' })
  @ApiResponse({ status: 200, description: 'Subscription cancelled successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  cancel(@Req() req: any, @Body('subscriptionId') subscriptionId: string) {
    const validId = SecurityUtil.validateId(subscriptionId);
    return this.handleAsyncOperation(
      this.subscriptionsService.cancel(req.user.id, validId),
    );
  }

  @Patch('auto-renew')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Toggle subscription auto-renewal' })
  @ApiResponse({ status: 200, description: 'Auto-renewal toggled successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  toggleAutoRenew(
    @Req() req: any,
    @Body('subscriptionId') subscriptionId: string,
    @Body('autoRenew') autoRenew: boolean,
  ) {
    const validId = SecurityUtil.validateId(subscriptionId);
    return this.handleAsyncOperation(
      this.subscriptionsService.toggleAutoRenew(req.user.id, validId, autoRenew),
    );
  }
}
