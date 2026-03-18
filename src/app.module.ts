import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { CacheModule } from '@nestjs/cache-manager';

import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { AuthModule } from './modules/auth/auth.module';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import databaseConfig from './config/database.config';
import stripeConfig from './config/stripe.config';
import r2Config from './config/r2.config';
import mailerConfig from './config/mailer.config';
import { PermissionsModule } from './modules/permissions/permissions.module';

// Global Guards and Interceptors

import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { ResponseInterceptor } from './common/interceptor/response.interceptor';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { RolePermissionsModule } from './modules/role-permissions/role-permissions.module';
import { SharedModule } from './modules/shared/shared.module';
import { GuardsModule } from './common/modules/guards.module';
import { StorageModule } from './common/modules/storage.module';

// Directory modules
import { CategoriesModule } from './modules/categories/categories.module';
import { CitiesModule } from './modules/cities/cities.module';
import { BusinessesModule } from './modules/businesses/businesses.module';
import { ReviewsModule } from './modules/reviews/reviews.module';

// New modules
import { CountriesModule } from './modules/countries/countries.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { BusinessCardsModule } from './modules/business-cards/business-cards.module';
import { BusinessMediaModule } from './modules/business-media/business-media.module';
import { SearchModule } from './modules/search/search.module';
import { AdminModule } from './modules/admin/admin.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { HealthModule } from './modules/health/health.module';
import { BusinessSocialsModule } from './modules/business-socials/business-socials.module';
import { BusinessHoursModule } from './modules/business-hours/business-hours.module';
import { BusinessServicesModule } from './modules/business-services/business-services.module';
import { BusinessProductsModule } from './modules/business-products/business-products.module';
import { BusinessBranchesModule } from './modules/business-branches/business-branches.module';
import { AuditLogInterceptor } from './common/interceptor/audit-log.interceptor';

// Middleware
import { CountryResolutionMiddleware } from './common/middleware/country-resolution.middleware';
import { SecurityValidationMiddleware } from './common/middleware/security-validation.middleware';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      cache: true,
      expandVariables: true,
      load: [stripeConfig, r2Config, mailerConfig],
    }),

    // Cron jobs scheduler
    ScheduleModule.forRoot(),

    // Database Configuration
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: databaseConfig,
      inject: [ConfigService],
    }),

    // Rate Limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: config.get<number>('THROTTLE_TTL', 60000), // 1 minute
            limit: config.get<number>('THROTTLE_LIMIT', 100), // 100 requests
          },
        ],
      }),
    }),

    // In-memory response cache
    CacheModule.register({
      isGlobal: true,
      ttl: 60000, // 60 seconds default
      max: 500,   // max cached items
    }),
    // Core modules
    GuardsModule,
    StorageModule,
    SharedModule,
    UsersModule,
    RolesModule,
    AuthModule,
    PermissionsModule,
    RolePermissionsModule,

    // Directory modules
    CategoriesModule,
    CitiesModule,
    BusinessesModule,
    ReviewsModule,

    // New modules
    CountriesModule,
    SubscriptionsModule,
    PaymentsModule,
    WebhooksModule,
    NotificationsModule,
    BusinessCardsModule,
    BusinessMediaModule,
    SearchModule,
    AdminModule,
    JobsModule,
    AuditLogsModule,
    HealthModule,
    BusinessSocialsModule,
    BusinessHoursModule,
    BusinessServicesModule,
    BusinessProductsModule,
    BusinessBranchesModule,
  ],
  controllers: [AppController],
  providers: [
    // Global Rate Limiting
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },

    // Global Authentication Guard (Optional - Uncomment if needed)
    // {
    //   provide: APP_GUARD,
    //   useClass: JwtAuthGuard,
    // },

    // Global Roles Guard (Optional - Uncomment if needed)
    // {
    //   provide: APP_GUARD,
    //   useClass: RolesGuard,
    // },

    // Global Permissions Guard (Optional - Uncomment if needed)
    // {
    //   provide: APP_GUARD,
    //   useClass: PermissionsGuard,
    // },

    // Global Response Interceptor
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },

    // Global Audit Log Interceptor (logs POST/PATCH/PUT/DELETE)
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLogInterceptor,
    },

    // Global Exception Filter
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    AppService,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(CorrelationIdMiddleware)
      .forRoutes('*');
    consumer
      .apply(SecurityValidationMiddleware)
      .forRoutes('*');
    consumer
      .apply(CountryResolutionMiddleware)
      .forRoutes('*');
  }
}
