import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { AuthService } from '../../src/modules/auth/auth.service';
import { UsersService } from '../../src/modules/users/users.service';
import { User } from '../../src/modules/users/entities/user.entity';
import { RefreshToken } from '../../src/modules/auth/entities/refresh-token.entity';
import { NotificationsService } from '../../src/modules/notifications/notifications.service';
import { mockRepository } from '../utils/test-helpers';

// Mock bcryptjs
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('$2a$12$hashedPassword'),
  compare: jest.fn(),
}));

import * as bcrypt from 'bcryptjs';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: Partial<UsersService>;
  let jwtService: Partial<JwtService>;
  let refreshTokenRepo: ReturnType<typeof mockRepository>;
  let userRepo: ReturnType<typeof mockRepository>;
  let notificationsService: Partial<NotificationsService>;
  let configService: Partial<ConfigService>;

  beforeEach(async () => {
    usersService = {
      findByEmail: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({
        success: true,
        data: { id: 'user-1', email: 'test@test.com', fullName: 'Test User' },
      }),
      findOne: jest.fn().mockResolvedValue({
        success: true,
        data: { id: 'user-1', email: 'test@test.com' },
      }),
      updatePassword: jest.fn().mockResolvedValue(undefined),
      findOneWithPermissions: jest.fn().mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
      }),
    };

    jwtService = {
      signAsync: jest.fn().mockResolvedValue('mock-jwt-token'),
      verifyAsync: jest.fn().mockResolvedValue({ sub: 'user-1', type: 'password-reset' }),
    };

    refreshTokenRepo = mockRepository();
    userRepo = mockRepository();

    notificationsService = {
      sendEmail: jest.fn().mockResolvedValue(undefined),
    };

    configService = {
      get: jest.fn().mockReturnValue('http://localhost:3000'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        { provide: getRepositoryToken(RefreshToken), useValue: refreshTokenRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: NotificationsService, useValue: notificationsService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── REGISTER ──────────────────────────────────────────────────
  describe('register', () => {
    const registerDto = {
      email: 'new@test.com',
      password: 'Password123!',
      fullName: 'New User',
    };

    it('should throw ConflictException when email already exists', async () => {
      (usersService.findByEmail as jest.Mock).mockResolvedValue({ id: 'existing' });

      await expect(service.register(registerDto as any)).rejects.toThrow(ConflictException);
    });

    it('should register user and send verification email', async () => {
      (usersService.findByEmail as jest.Mock).mockResolvedValue(null);
      userRepo.update.mockResolvedValue({});

      const result = await service.register(registerDto as any);

      expect(result.success).toBe(true);
      expect(result.message).toContain('registered successfully');
      expect(usersService.create).toHaveBeenCalled();
      expect(userRepo.update).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          verificationToken: expect.any(String),
          verificationTokenExpires: expect.any(Date),
        }),
      );
    });
  });

  // ─── VERIFY EMAIL ─────────────────────────────────────────────
  describe('verifyEmail', () => {
    it('should throw BadRequestException when token is empty', async () => {
      await expect(service.verifyEmail('')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid token', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(service.verifyEmail('bad-token')).rejects.toThrow(BadRequestException);
    });

    it('should return already verified if user is verified', async () => {
      userRepo.findOne.mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        isVerified: true,
      });

      const result = await service.verifyEmail('valid-token');

      expect(result.message).toContain('already verified');
    });

    it('should throw BadRequestException when token is expired', async () => {
      userRepo.findOne.mockResolvedValue({
        id: 'user-1',
        isVerified: false,
        verificationTokenExpires: new Date(Date.now() - 1000), // expired
      });

      await expect(service.verifyEmail('expired-token')).rejects.toThrow(BadRequestException);
    });

    it('should verify email and send welcome message', async () => {
      userRepo.findOne.mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        fullName: 'Test',
        isVerified: false,
        verificationTokenExpires: new Date(Date.now() + 60000), // valid
      });
      userRepo.update.mockResolvedValue({});

      const result = await service.verifyEmail('valid-token');

      expect(result.success).toBe(true);
      expect(result.message).toContain('verified successfully');
      expect(userRepo.update).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          isVerified: true,
          emailVerifiedAt: expect.any(Date),
          verificationToken: null,
          verificationTokenExpires: null,
        }),
      );
    });
  });

  // ─── RESEND VERIFICATION ──────────────────────────────────────
  describe('resendVerification', () => {
    it('should return success even when user not found (prevent enumeration)', async () => {
      (usersService.findByEmail as jest.Mock).mockResolvedValue(null);

      const result = await service.resendVerification('nobody@test.com');

      expect(result.success).toBe(true);
    });

    it('should return success if already verified', async () => {
      (usersService.findByEmail as jest.Mock).mockResolvedValue({
        id: 'user-1',
        isVerified: true,
      });

      const result = await service.resendVerification('test@test.com');

      expect(result.message).toContain('already verified');
    });

    it('should send new verification email', async () => {
      (usersService.findByEmail as jest.Mock).mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        fullName: 'Test',
        isVerified: false,
      });
      userRepo.update.mockResolvedValue({});

      const result = await service.resendVerification('test@test.com');

      expect(result.success).toBe(true);
      expect(userRepo.update).toHaveBeenCalled();
      expect(notificationsService.sendEmail).toHaveBeenCalledWith(
        'verify-email',
        'test@test.com',
        'Verify your email address',
        expect.objectContaining({ verificationUrl: expect.stringContaining('token=') }),
        'user-1',
      );
    });
  });

  // ─── VALIDATE USER ────────────────────────────────────────────
  describe('validateUser', () => {
    it('should return user when credentials match', async () => {
      const user = { id: 'user-1', email: 'test@test.com', password: 'hashed' };
      (usersService.findByEmail as jest.Mock).mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('test@test.com', 'password');

      expect(result).toEqual(user);
    });

    it('should return null when user not found', async () => {
      (usersService.findByEmail as jest.Mock).mockResolvedValue(null);

      const result = await service.validateUser('nobody@test.com', 'password');

      expect(result).toBeNull();
    });

    it('should return null when password does not match', async () => {
      (usersService.findByEmail as jest.Mock).mockResolvedValue({
        id: 'user-1',
        password: 'hashed',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser('test@test.com', 'wrong');

      expect(result).toBeNull();
    });
  });

  // ─── LOGIN ─────────────────────────────────────────────────────
  describe('login', () => {
    const loginDto = { email: 'test@test.com', password: 'Password123!' };

    it('should throw UnauthorizedException when user not found', async () => {
      (usersService.findByEmail as jest.Mock).mockResolvedValue(null);

      await expect(service.login(loginDto as any)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when password is wrong', async () => {
      (usersService.findByEmail as jest.Mock).mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        password: 'hashed',
        isActive: true,
        isVerified: true,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto as any)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw ForbiddenException when user is suspended', async () => {
      (usersService.findByEmail as jest.Mock).mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        password: 'hashed',
        isActive: false,
        isVerified: true,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(service.login(loginDto as any)).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when email not verified', async () => {
      (usersService.findByEmail as jest.Mock).mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        password: 'hashed',
        isActive: true,
        isVerified: false,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(service.login(loginDto as any)).rejects.toThrow(ForbiddenException);
    });

    it('should return tokens on successful login', async () => {
      (usersService.findByEmail as jest.Mock).mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        password: 'hashed',
        isActive: true,
        isVerified: true,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      refreshTokenRepo.create.mockReturnValue({ token: 'refresh-token', userId: 'user-1' });
      refreshTokenRepo.save.mockResolvedValue({
        token: 'refresh-token',
        userId: 'user-1',
        expiresAt: new Date(),
      });

      const result = await service.login(loginDto as any);

      expect(result.success).toBe(true);
      expect(result.data.accessToken).toBe('mock-jwt-token');
      expect(result.data.refreshToken).toBeDefined();
    });
  });

  // ─── REFRESH TOKEN ─────────────────────────────────────────────
  describe('refreshToken', () => {
    it('should throw UnauthorizedException for invalid token', async () => {
      refreshTokenRepo.findOne.mockResolvedValue(null);

      await expect(
        service.refreshToken({ refreshToken: 'bad-token' } as any),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for expired token', async () => {
      refreshTokenRepo.findOne.mockResolvedValue({
        id: 'rt-1',
        token: 'token',
        expiresAt: new Date(Date.now() - 1000), // expired
        user: { id: 'user-1', email: 'test@test.com', isActive: true },
      });

      await expect(
        service.refreshToken({ refreshToken: 'token' } as any),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw ForbiddenException for suspended user', async () => {
      refreshTokenRepo.findOne.mockResolvedValue({
        id: 'rt-1',
        token: 'token',
        expiresAt: new Date(Date.now() + 60000),
        user: { id: 'user-1', email: 'test@test.com', isActive: false },
      });
      refreshTokenRepo.update.mockResolvedValue({});

      await expect(
        service.refreshToken({ refreshToken: 'token' } as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return new access token for valid refresh token', async () => {
      refreshTokenRepo.findOne.mockResolvedValue({
        id: 'rt-1',
        token: 'valid-token',
        expiresAt: new Date(Date.now() + 60000),
        user: { id: 'user-1', email: 'test@test.com', isActive: true },
      });

      const result = await service.refreshToken({ refreshToken: 'valid-token' } as any);

      expect(result.success).toBe(true);
      expect(result.data.accessToken).toBe('mock-jwt-token');
    });
  });

  // ─── LOGOUT ────────────────────────────────────────────────────
  describe('logout', () => {
    it('should throw UnauthorizedException for invalid token', async () => {
      refreshTokenRepo.update.mockResolvedValue({ affected: 0 });

      await expect(service.logout('bad-token')).rejects.toThrow(UnauthorizedException);
    });

    it('should revoke token and return success', async () => {
      refreshTokenRepo.update.mockResolvedValue({ affected: 1 });

      const result = await service.logout('valid-token');

      expect(result.success).toBe(true);
      expect(refreshTokenRepo.update).toHaveBeenCalledWith(
        { token: 'valid-token' },
        { isRevoked: true },
      );
    });
  });

  // ─── REQUEST PASSWORD RESET ────────────────────────────────────
  describe('requestPasswordReset', () => {
    it('should return success even when user not found (prevent enumeration)', async () => {
      (usersService.findByEmail as jest.Mock).mockResolvedValue(null);

      const result = await service.requestPasswordReset({ email: 'nobody@test.com' } as any);

      expect(result.success).toBe(true);
    });

    it('should generate reset token and send email', async () => {
      (usersService.findByEmail as jest.Mock).mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        fullName: 'Test',
      });

      const result = await service.requestPasswordReset({ email: 'test@test.com' } as any);

      expect(result.success).toBe(true);
      expect(jwtService.signAsync).toHaveBeenCalledWith(
        { sub: 'user-1', type: 'password-reset' },
        { expiresIn: '1h' },
      );
      expect(notificationsService.sendEmail).toHaveBeenCalledWith(
        'password-reset',
        'test@test.com',
        'Reset your password',
        expect.objectContaining({ resetUrl: expect.stringContaining('token=') }),
        'user-1',
      );
    });
  });

  // ─── RESET PASSWORD ───────────────────────────────────────────
  describe('resetPassword', () => {
    it('should throw UnauthorizedException for invalid token type', async () => {
      (jwtService.verifyAsync as jest.Mock).mockResolvedValue({
        sub: 'user-1',
        type: 'access', // wrong type
      });

      await expect(
        service.resetPassword({ token: 'bad', password: 'NewPassword123!' } as any),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reset password and revoke all refresh tokens', async () => {
      (jwtService.verifyAsync as jest.Mock).mockResolvedValue({
        sub: 'user-1',
        type: 'password-reset',
      });
      refreshTokenRepo.update.mockResolvedValue({});

      const result = await service.resetPassword({
        token: 'valid-token',
        password: 'NewPassword123!',
      } as any);

      expect(result.success).toBe(true);
      expect(usersService.updatePassword).toHaveBeenCalledWith('user-1', '$2a$12$hashedPassword');
      expect(refreshTokenRepo.update).toHaveBeenCalledWith(
        { userId: 'user-1' },
        { isRevoked: true },
      );
    });

    it('should throw UnauthorizedException when token verification fails', async () => {
      (jwtService.verifyAsync as jest.Mock).mockRejectedValue(new Error('jwt expired'));

      await expect(
        service.resetPassword({ token: 'expired', password: 'Pass123!' } as any),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ─── GET CURRENT USER ─────────────────────────────────────────
  describe('getCurrentUser', () => {
    it('should return user data', async () => {
      const result = await service.getCurrentUser('user-1');

      expect(result.success).toBe(true);
      expect(usersService.findOne).toHaveBeenCalledWith('user-1');
    });
  });

  // ─── GET CURRENT USER BY EMAIL ─────────────────────────────────
  describe('getCurrentUserByEmail', () => {
    it('should throw NotFoundException when user not found', async () => {
      (usersService.findByEmail as jest.Mock).mockResolvedValue(null);

      await expect(service.getCurrentUserByEmail('nobody@test.com')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return user without password', async () => {
      (usersService.findByEmail as jest.Mock).mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        password: 'secret',
      });

      const result = await service.getCurrentUserByEmail('test@test.com');

      expect(result.email).toBe('test@test.com');
    });
  });

  // ─── GET USER WITH DETAILS ─────────────────────────────────────
  describe('getUserWithDetails', () => {
    it('should delegate to usersService.findOneWithPermissions', async () => {
      await service.getUserWithDetails('user-1');

      expect(usersService.findOneWithPermissions).toHaveBeenCalledWith('user-1');
    });
  });
});
