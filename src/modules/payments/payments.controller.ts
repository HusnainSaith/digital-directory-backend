import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { BaseController } from '../../common/controllers/base.controller';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { SecurityUtil } from '../../common/utils/security.util';

@ApiTags('Payments')
@Controller('payments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class PaymentsController extends BaseController {
  constructor(private readonly paymentsService: PaymentsService) {
    super();
  }

  @Get()
  @ApiOperation({ summary: 'Get current user payment history' })
  @ApiResponse({ status: 200, description: 'Payment history retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findMyPayments(
    @CurrentUser() user: User,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.handleAsyncOperation(
      this.paymentsService.findByUser(user.id, { page, limit }),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payment by ID' })
  @ApiResponse({ status: 200, description: 'Payment details retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    const validId = SecurityUtil.validateId(id);
    return this.handleAsyncOperation(
      this.paymentsService.findOne(validId, user.id),
    );
  }

  @Get('subscription/:subscriptionId')
  @ApiOperation({ summary: 'Get payments for a specific subscription' })
  @ApiResponse({ status: 200, description: 'Subscription payments retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  findBySubscription(
    @Param('subscriptionId') subscriptionId: string,
    @CurrentUser() user: User,
  ) {
    const validId = SecurityUtil.validateId(subscriptionId);
    return this.handleAsyncOperation(
      this.paymentsService.findBySubscription(validId),
    );
  }
}
