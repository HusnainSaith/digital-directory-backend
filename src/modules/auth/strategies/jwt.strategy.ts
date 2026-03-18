import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { UsersService } from '../../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    try {
      const cacheKey = `jwt_user:${payload.sub}`;

      // Return cached user profile to avoid a DB round-trip on every request
      const cached = await this.cacheManager.get<{
        id: string;
        email: string;
        name: string;
        role: any;
        permissions: any[];
      }>(cacheKey);
      if (cached) return cached;

      const user = await this.usersService.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('Invalid token - user not found');
      }

      const userProfile = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        permissions: user.permissions || [],
      };

      // Cache for 60 seconds (aligned with global CacheModule TTL)
      await this.cacheManager.set(cacheKey, userProfile, 60000);

      return userProfile;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
