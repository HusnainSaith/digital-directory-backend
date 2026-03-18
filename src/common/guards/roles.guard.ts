import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { RoleEnum } from '../../modules/roles/role.enum';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<RoleEnum[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no roles are required, allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Check if user is authenticated
    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    // Debug logging (remove in production)

    // Get user role name - handle different possible structures
    let userRoleName: string | null = null;

    if (user.role) {
      // Handle case where role is an object with name property
      if (typeof user.role === 'object' && user.role.name) {
        userRoleName = user.role.name;
      }
      // Handle case where role is a string
      else if (typeof user.role === 'string') {
        userRoleName = user.role;
      }
    }

    // Check if user has required role
    if (!userRoleName) {
      throw new ForbiddenException('User has no assigned role');
    }

    // Convert role name to enum value for comparison
    const hasRequiredRole = requiredRoles.some((requiredRole) => {
      // Handle both enum values and string values
      return (
        requiredRole === userRoleName ||
        requiredRole.toString() === userRoleName ||
        Object.values(RoleEnum).includes(userRoleName as RoleEnum)
      );
    });

    if (!hasRequiredRole) {
      throw new ForbiddenException(
        `Access denied. Required roles: ${requiredRoles.join(', ')}. User role: ${userRoleName}`,
      );
    }

    return true;
  }
}
