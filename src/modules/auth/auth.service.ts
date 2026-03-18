import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { BCRYPT_SALT_ROUNDS } from '../../common/constants/security.constants';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { AuthCredentialsDto } from './dto/auth-credentials.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import {
  RefreshTokenDto,
  PasswordResetDto,
  ResetPasswordDto,
} from './dto/refresh-token.dto';
import { User } from '../users/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { ConfigService } from '@nestjs/config';

import { SafeLogger } from '../../common/utils/logger.util';
import { ValidationUtil } from '../../common/utils/validation.util';

// Create a type for User without password
type UserWithoutPassword = Omit<User, 'passwordHash'>;

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly notificationsService: NotificationsService,
    private readonly configService: ConfigService,
  ) {}

  private get frontendUrl(): string {
    const urls = this.configService.get<string>('FRONTEND_URLS', 'http://localhost:3000');
    return urls.split(',')[0]?.trim() || 'http://localhost:3000';
  }

  async register(
    dto: RegisterDto,
  ): Promise<{ success: boolean; message: string; user: UserWithoutPassword }> {
    ValidationUtil.validateEmail(dto.email);
    ValidationUtil.validatePassword(dto.password);

    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    const userResponse = await this.usersService.create({
      email: ValidationUtil.sanitizeString(dto.email.toLowerCase()),
      password: dto.password,
      name: ValidationUtil.sanitizeString(dto.name),
      roleId: dto.roleId,
    });

    // Extract user data and ALWAYS exclude passwordHash — it is present
    // in memory on the saved entity even though the column has select:false
    const userData = userResponse.data || (userResponse as any);
    const { passwordHash: _regPw, ...userWithoutPassword } = userData as any;

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await this.userRepository.update(userData.id, {
      verificationToken,
      verificationTokenExpires,
    });

    // Send verification email
    const verifyUrl = `${this.frontendUrl}/auth/verify-email?token=${verificationToken}`;
    try {
      await this.notificationsService.sendEmail(
        'verify-email',
        userData.email,
        'Verify your email address',
        {
          name: userData.name || userData.email,
          verificationUrl: verifyUrl,
          expiresIn: '24 hours',
        },
        userData.id,
      );
      SafeLogger.log(`Verification email sent to: ${userData.email}`, 'AuthService');
    } catch (err) {
      SafeLogger.error(`Failed to send verification email to ${userData.email}: ${err.message}`, 'AuthService');
      SafeLogger.error(`Email config - Host: ${this.configService.get('SMTP_HOST')}, Port: ${this.configService.get('SMTP_PORT')}, User: ${this.configService.get('SMTP_USER')}`, 'AuthService');
    }

    SafeLogger.log(`User registered successfully: ${dto.email}`, 'AuthService');
    this.notificationsService.logActivity(userData.id, 'user_registered', userData.id).catch(() => {});

    return {
      success: true,
      message: 'User registered successfully. Please check your email to verify your account.',
      user: userWithoutPassword,
    };
  }

  async verifyEmail(token: string): Promise<{ success: boolean; message: string }> {
    if (!token) {
      throw new BadRequestException('Verification token is required');
    }

    const user = await this.userRepository.findOne({
      where: { verificationToken: token },
      select: ['id', 'email', 'name', 'isVerified', 'verificationToken', 'verificationTokenExpires'],
    });

    if (!user) {
      throw new BadRequestException('Invalid verification token');
    }

    if (user.isVerified) {
      return { success: true, message: 'Email is already verified' };
    }

    if (user.verificationTokenExpires && user.verificationTokenExpires < new Date()) {
      throw new BadRequestException('Verification token has expired. Please request a new one.');
    }

    await this.userRepository.update(user.id, {
      isVerified: true,
      emailVerifiedAt: new Date(),
      verificationToken: null,
      verificationTokenExpires: null,
    });

    // Send welcome email
    await this.notificationsService.sendEmail(
      'welcome',
      user.email,
      'Welcome to the Digital Business Directory!',
      {
        name: user.name || user.email,
        loginUrl: `${this.frontendUrl}/login`,
      },
      user.id,
    ).catch((err) => {
      SafeLogger.error(`Failed to send welcome email: ${err.message}`, 'AuthService');
    });

    SafeLogger.log(`Email verified for user: ${user.email}`, 'AuthService');
    return { success: true, message: 'Email verified successfully. You can now log in.' };
  }

  async resendVerification(email: string): Promise<{ success: boolean; message: string }> {
    ValidationUtil.validateEmail(email);

    const user = await this.usersService.findByEmail(email.toLowerCase().trim());
    if (!user) {
      // Return success even if user not found to prevent email enumeration
      SafeLogger.log(`Resend verification attempted for non-existent email: ${email}`, 'AuthService');
      return { success: true, message: 'If the email exists, a verification link has been sent.' };
    }

    if (user.isVerified) {
      SafeLogger.log(`Resend verification attempted for already verified user: ${email}`, 'AuthService');
      return { success: true, message: 'Your email is already verified. You can log in now.' };
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.userRepository.update(user.id, {
      verificationToken,
      verificationTokenExpires,
    });

    const verifyUrl = `${this.frontendUrl}/auth/verify-email?token=${verificationToken}`;
    await this.notificationsService.sendEmail(
      'verify-email',
      user.email,
      'Verify your email address',
      {
        name: user.name || user.email,
        verificationUrl: verifyUrl,
        expiresIn: '24 hours',
      },
      user.id,
    ).catch((err) => {
      SafeLogger.error(`Failed to send verification email: ${err.message}`, 'AuthService');
    });

    SafeLogger.log(`Verification email resent to: ${user.email}`, 'AuthService');
    return { success: true, message: 'If the email exists, a verification link has been sent.' };
  }

  async validateUser(email: string, password: string): Promise<User> {
    const user = await this.usersService.findByEmail(email, {
      includePassword: true,
    });
    if (user && (await bcrypt.compare(password, user.passwordHash))) {
      return user;
    }
    return null;
  }

  async login(
    dto: AuthCredentialsDto,
  ): Promise<{ success: boolean; message: string; data: LoginResponseDto }> {
    ValidationUtil.validateEmail(dto.email);
    ValidationUtil.validateString(dto.password, 'password', 1);

    const user = await this.usersService.findByEmail(
      dto.email.toLowerCase().trim(),
      {
        includePassword: true,
      },
    );
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Check if user is active
    if (user.isActive === false) {
      throw new ForbiddenException('Your account has been suspended. Please contact support.');
    }

    // Check if email is verified
    if (!user.isVerified) {
      throw new ForbiddenException('Please verify your email address before logging in. Check your inbox for the verification link.');
    }

    // Explicitly exclude passwordHash from the response
    const { passwordHash: _pw, ...userSafe } = user as any;
    const payload = { sub: user.id, email: user.email, role: user.role?.name || 'owner' };

    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: this.configService.get('JWT_ACCESS_EXPIRY') || '15m',
    });
    const refreshToken = await this.generateRefreshToken(user.id);

    SafeLogger.log(`User logged in successfully: ${dto.email}`, 'AuthService');
    this.notificationsService.logActivity(user.id, 'user_logged_in', user.id).catch(() => {});
    return {
      success: true,
      message: 'Login successful',
      data: { accessToken, refreshToken: refreshToken.token, user: userSafe },
    };
  }

  async refreshToken(dto: RefreshTokenDto): Promise<{
    success: boolean;
    message: string;
    data: { accessToken: string; refreshToken: string };
  }> {
    ValidationUtil.validateString(dto.refreshToken, 'refreshToken');

    const refreshToken = await this.refreshTokenRepository.findOne({
      where: { token: dto.refreshToken, isRevoked: false },
      relations: ['user', 'user.role'],
    });

    if (!refreshToken || refreshToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Block suspended users from refreshing tokens
    if (refreshToken.user.isActive === false) {
      await this.refreshTokenRepository.update(refreshToken.id, { isRevoked: true });
      throw new ForbiddenException('Your account has been suspended.');
    }

    // Revoke the old refresh token (rotation)
    await this.refreshTokenRepository.update(refreshToken.id, { isRevoked: true });

    const payload = {
      sub: refreshToken.user.id,
      email: refreshToken.user.email,
      role: refreshToken.user.role?.name || 'owner',
    };
    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: this.configService.get('JWT_ACCESS_EXPIRY') || '15m',
    });

    // Issue a new refresh token (rotation)
    const newRefreshToken = await this.generateRefreshToken(refreshToken.user.id);

    SafeLogger.log(
      `Token refreshed for user: ${refreshToken.user.email}`,
      'AuthService',
    );
    return {
      success: true,
      message: 'Token refreshed successfully',
      data: { accessToken, refreshToken: newRefreshToken.token },
    };
  }

  async logout(
    refreshToken: string,
  ): Promise<{ success: boolean; message: string }> {
    ValidationUtil.validateString(refreshToken, 'refreshToken');

    const result = await this.refreshTokenRepository.update(
      { token: refreshToken },
      { isRevoked: true },
    );

    if (result.affected === 0) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    SafeLogger.log('User logged out successfully', 'AuthService');
    return {
      success: true,
      message: 'Logged out successfully',
    };
  }

  async requestPasswordReset(
    dto: PasswordResetDto,
  ): Promise<{ success: boolean; message: string }> {
    ValidationUtil.validateEmail(dto.email);

    const user = await this.usersService.findByEmail(
      dto.email.toLowerCase().trim(),
    );

    // Always return success to prevent email enumeration
    if (!user) {
      return {
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.',
      };
    }

    const resetToken = await this.jwtService.signAsync(
      { sub: user.id, type: 'password-reset' },
      { expiresIn: '1h' },
    );

    // Send password reset email
    const resetUrl = `${this.frontendUrl}/reset-password?token=${resetToken}`;
    await this.notificationsService.sendEmail(
      'password-reset',
      user.email,
      'Reset your password',
      {
        name: user.name || user.email,
        resetUrl,
        expiresIn: '1 hour',
      },
      user.id,
    ).catch((err) => {
      SafeLogger.error(`Failed to send password reset email: ${err.message}`, 'AuthService');
    });

    SafeLogger.log(
      `Password reset email sent to: ${dto.email}`,
      'AuthService',
    );

    return {
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.',
    };
  }

  async resetPassword(
    dto: ResetPasswordDto,
  ): Promise<{ success: boolean; message: string }> {
    ValidationUtil.validateString(dto.token, 'token');
    ValidationUtil.validatePassword(dto.password);

    try {
      const payload = await this.jwtService.verifyAsync(dto.token);
      if (payload.type !== 'password-reset') {
        throw new UnauthorizedException('Invalid token type');
      }

      const hashedPassword = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);
      await this.usersService.updatePassword(payload.sub, hashedPassword);

      // Revoke all refresh tokens for this user for security
      await this.refreshTokenRepository.update(
        { userId: payload.sub },
        { isRevoked: true },
      );

      SafeLogger.log(
        `Password reset successful for user ID: ${payload.sub}`,
        'AuthService',
      );
      this.notificationsService.logActivity(payload.sub, 'password_reset', payload.sub).catch(() => {});
      return {
        success: true,
        message:
          'Password has been changed successfully. Please login with your new password.',
      };
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired reset token');
    }
  }

  async getCurrentUser(
    userId: string,
  ): Promise<{ success: boolean; message: string; data: any }> {
    // findOne returns ServiceResponse<User> — use .data so we don't double-wrap
    const response = await this.usersService.findOne(userId);
    return {
      success: true,
      message: 'User details retrieved successfully',
      data: response.data,
    };
  }

  async getCurrentUserByEmail(email: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    // Explicitly exclude passwordHash from the response
    const { passwordHash: _pw, ...userWithoutPassword } = user as any;
    return userWithoutPassword;
  }

  private async generateRefreshToken(userId: string): Promise<RefreshToken> {
    const refreshExpiry = this.configService.get('JWT_REFRESH_EXPIRY') || '7d';
    const token = await this.jwtService.signAsync(
      { sub: userId, type: 'refresh' },
      { expiresIn: refreshExpiry },
    );

    // Parse expiry duration for DB record
    const daysMatch = refreshExpiry.match(/(\d+)d/);
    const expiryMs = daysMatch
      ? parseInt(daysMatch[1]) * 24 * 60 * 60 * 1000
      : 7 * 24 * 60 * 60 * 1000;

    const refreshToken = this.refreshTokenRepository.create({
      token,
      userId,
      expiresAt: new Date(Date.now() + expiryMs),
    });

    return this.refreshTokenRepository.save(refreshToken);
  }

  async getUserWithDetails(userId: string) {
    return this.usersService.findOneWithPermissions(userId);
  }
}
