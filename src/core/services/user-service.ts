import type { SocialAccount } from '@prisma/client';

import { comparePassword, hashPassword, validatePasswordStrength } from '../auth/password.js';
import { decryptToken, encryptToken } from '../auth/encryption.js';
import { generateToken } from '../auth/jwt.js';
import { ConflictError, UnauthorizedError, ValidationError } from '../errors.js';
import { Platform } from '../interfaces.js';
import { prisma } from '../../database/prisma-client.js';
import { logger } from '../../utils/logger.js';
import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  UserResponse,
} from '../../types/auth.js';

export interface ConnectPlatformData {
  userId: string;
  platform: Platform;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  extra?: Record<string, unknown>;
}

export class UserService {
  async register(data: RegisterRequest): Promise<AuthResponse> {
    const { email, password } = data;

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new ValidationError('Invalid email format');
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      throw new ValidationError(passwordValidation.errors.join(', '));
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
      },
    });

    logger.info('User registered', { userId: user.id, email: user.email });

    // Generate JWT token
    const token = generateToken(user.id, user.email);

    return {
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      token,
    };
  }

  async login(data: LoginRequest): Promise<AuthResponse> {
    const { email, password } = data;

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Compare password
    const isPasswordValid = await comparePassword(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    logger.info('User logged in', { userId: user.id, email: user.email });

    // Generate JWT token
    const token = generateToken(user.id, user.email);

    return {
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      token,
    };
  }

  async getUserById(userId: string): Promise<UserResponse | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Connect a social platform account to a user
   */
  async connectPlatform(data: ConnectPlatformData): Promise<SocialAccount> {
    const { userId, platform, accessToken, refreshToken, expiresAt, extra } = data;

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new ValidationError('User not found');
    }

    // Encrypt tokens
    const encryptedAccessToken = encryptToken(accessToken);
    const encryptedRefreshToken = refreshToken ? encryptToken(refreshToken) : null;

    // Upsert social account (update if exists, create if not)
    const socialAccount = await prisma.socialAccount.upsert({
      where: {
        userId_platform: {
          userId,
          platform,
        },
      },
      update: {
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt,
        extra: extra ? JSON.stringify(extra) : null,
        updatedAt: new Date(),
      },
      create: {
        userId,
        platform,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt,
        extra: extra ? JSON.stringify(extra) : null,
      },
    });

    logger.info('Platform connected', { userId, platform, socialAccountId: socialAccount.id });

    return socialAccount;
  }

  /**
   * Get all connected platforms for a user
   */
  async getConnectedPlatforms(userId: string): Promise<
    Array<{
      id: string;
      platform: string;
      expiresAt: Date | null;
      extra: Record<string, unknown> | null;
      createdAt: Date;
      updatedAt: Date;
    }>
  > {
    const socialAccounts = await prisma.socialAccount.findMany({
      where: { userId },
      select: {
        id: true,
        platform: true,
        expiresAt: true,
        extra: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return socialAccounts.map((account) => ({
      ...account,
      extra: account.extra ? (JSON.parse(account.extra) as Record<string, unknown>) : null,
    }));
  }

  /**
   * Get decrypted tokens for a platform
   */
  async getPlatformTokens(
    userId: string,
    platform: Platform
  ): Promise<{
    accessToken: string;
    refreshToken: string | null;
    expiresAt: Date | null;
  } | null> {
    const socialAccount = await prisma.socialAccount.findUnique({
      where: {
        userId_platform: {
          userId,
          platform,
        },
      },
    });

    if (!socialAccount) {
      return null;
    }

    // Decrypt tokens
    const accessToken = decryptToken(socialAccount.accessToken);
    const refreshToken = socialAccount.refreshToken
      ? decryptToken(socialAccount.refreshToken)
      : null;

    return {
      accessToken,
      refreshToken,
      expiresAt: socialAccount.expiresAt,
    };
  }

  /**
   * Disconnect a platform from a user
   */
  async disconnectPlatform(userId: string, platform: Platform): Promise<void> {
    await prisma.socialAccount.delete({
      where: {
        userId_platform: {
          userId,
          platform,
        },
      },
    });

    logger.info('Platform disconnected', { userId, platform });
  }

  /**
   * Delete a user account
   */
  async deleteUser(userId: string): Promise<void> {
    await prisma.user.delete({
      where: { id: userId },
    });

    logger.info('User deleted', { userId });
  }
}

export const userService = new UserService();
