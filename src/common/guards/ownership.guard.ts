import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoleEnum } from '../../modules/roles/role.enum';

/**
 * OwnershipGuard verifies that the authenticated user owns the business resource.
 * Super admins bypass this check.
 *
 * Usage:
 *   @UseGuards(JwtAuthGuard, OwnershipGuard)
 *   @Patch(':businessId')
 *   update(...) { ... }
 *
 * The guard looks for 'businessId' or 'id' in route params,
 * queries the businesses table, and compares owner_id with req.user.id.
 */
@Injectable()
export class OwnershipGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // Super admins bypass ownership check
    const userRoleName = typeof user.role === 'object' ? user.role?.name : user.role;
    if (userRoleName === RoleEnum.SUPER_ADMIN || userRoleName === RoleEnum.ADMIN) {
      return true;
    }

    // Get business ID from route params
    const businessId = request.params.businessId || request.params.id;
    if (!businessId) {
      return true; // No business ID in route — skip ownership check
    }

    // Query the business for its user_id using raw SQL to avoid circular deps
    const result = await request.app
      .get('DataSource')
      ?.manager?.query(
        'SELECT user_id FROM businesses WHERE id = $1',
        [businessId],
      );

    if (!result || result.length === 0) {
      throw new NotFoundException('Business not found');
    }

    const ownerId = result[0].user_id;

    if (!ownerId) {
      // No owner set on this business — allow admin, deny others
      throw new ForbiddenException('This business has no owner assigned');
    }

    if (ownerId !== user.id) {
      throw new ForbiddenException('You do not have permission to modify this business');
    }

    return true;
  }
}
