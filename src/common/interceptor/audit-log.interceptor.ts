import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AuditLogsService } from '../../modules/audit-logs/audit-logs.service';

/**
 * Interceptor that automatically logs mutating requests (POST, PATCH, PUT, DELETE)
 * to the audit_logs table. Apply globally or selectively on controllers.
 */
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);

  constructor(private readonly auditLogsService: AuditLogsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const method: string = req.method;

    // Only log mutating requests
    if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
      return next.handle();
    }

    const userId = req.user?.id;
    const action = method;
    const resource = context.getClass().name.replace('Controller', '');
    const resourceId =
      req.params?.id || req.params?.businessId || req.params?.subscriptionId || undefined;
    const ipAddress =
      req.headers['x-forwarded-for']?.toString().split(',')[0] || req.ip;
    const userAgent = req.headers['user-agent'];

    return next.handle().pipe(
      tap({
        next: (responseBody) => {
          this.auditLogsService
            .log({
              userId,
              action,
              resource,
              resourceId,
              details: {
                path: req.url,
                handler: context.getHandler().name,
              },
              ipAddress,
              userAgent,
            })
            .catch((err) =>
              this.logger.error(`Audit log failed: ${err.message}`),
            );
        },
        error: () => {
          // Don't log failed requests
        },
      }),
    );
  }
}
