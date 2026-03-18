import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { StripeHealthIndicator } from './indicators/stripe.health';
import { R2HealthIndicator } from './indicators/r2.health';
import { MailHealthIndicator } from './indicators/mail.health';
import { SkipThrottle } from '@nestjs/throttler';

@ApiTags('Health')
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
    private readonly stripe: StripeHealthIndicator,
    private readonly r2: R2HealthIndicator,
    private readonly mail: MailHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Full health check (DB, R2, Stripe, Email)' })
  @ApiResponse({ status: 200, description: 'All services healthy' })
  @ApiResponse({ status: 503, description: 'One or more services unhealthy' })
  check() {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.stripe.isHealthy('stripe'),
      () => this.r2.isHealthy('r2-storage'),
      () => this.mail.isHealthy('mail'),
    ]);
  }

  @Get('db')
  @HealthCheck()
  @ApiOperation({ summary: 'Database connectivity check' })
  @ApiResponse({ status: 200, description: 'Database is healthy' })
  @ApiResponse({ status: 503, description: 'Database is unhealthy' })
  checkDb() {
    return this.health.check([
      () => this.db.pingCheck('database'),
    ]);
  }

  @Get('liveness')
  @ApiOperation({ summary: 'Simple liveness probe' })
  @ApiResponse({ status: 200, description: 'Application is alive' })
  liveness() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}
