import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { ServiceResponse } from '../../common/interfaces/service-response.interface';

@Injectable()
export class AuditLogsService {
  private readonly logger = new Logger(AuditLogsService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  async log(params: {
    userId?: string;
    action: string;
    resource: string;
    resourceId?: string;
    details?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    try {
      const entry = this.auditLogRepository.create(params);
      await this.auditLogRepository.save(entry);
    } catch (error) {
      this.logger.error(`Failed to write audit log: ${error.message}`, error.stack);
    }
  }

  async findAll(query?: {
    page?: number;
    limit?: number;
    userId?: string;
    action?: string;
    resource?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<ServiceResponse<AuditLog[]>> {
    const page = query?.page || 1;
    const limit = Math.min(100, Math.max(1, query?.limit || 20));

    const qb = this.auditLogRepository.createQueryBuilder('audit_log')
      .leftJoinAndSelect('audit_log.user', 'user')
      .orderBy('audit_log.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query?.userId) qb.andWhere('audit_log.userId = :userId', { userId: query.userId });
    if (query?.action) qb.andWhere('audit_log.action = :action', { action: query.action });
    if (query?.resource) qb.andWhere('audit_log.resource = :resource', { resource: query.resource });
    if (query?.dateFrom) qb.andWhere('audit_log.createdAt >= :dateFrom', { dateFrom: new Date(query.dateFrom) });
    if (query?.dateTo) qb.andWhere('audit_log.createdAt <= :dateTo', { dateTo: new Date(`${query.dateTo}T23:59:59.999Z`) });

    const [data, total] = await qb.getManyAndCount();

    return {
      success: true,
      message: 'Audit logs retrieved',
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async cleanup(olderThanDays: number = 90): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - olderThanDays);

    const result = await this.auditLogRepository.delete({
      createdAt: LessThan(cutoff),
    });

    this.logger.log(`Cleaned up ${result.affected} audit log entries older than ${olderThanDays} days`);
    return result.affected || 0;
  }
}
