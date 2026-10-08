import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { JwtSignOptions } from '@nestjs/jwt';
import { SignUpDto } from './dto/signup.dto';
import { SignInDto } from './dto/signin.dto';
import { UsersService } from '../users/users.service';
import argon2 from 'argon2';
import type { JwtPayload } from './types/jwt-payload';
import type { AuthResult } from './types/auth-results';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { InjectDrizzle } from '@nestjs/drizzle';
import { refresh_tokens, users } from '../db/schema';
import { and, eq, gt } from 'drizzle-orm';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectDrizzle() private readonly db: NodePgDatabase,
  ) {}

  private generateToken(payload: JwtPayload): Promise<string> {
    return this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('JWT_SECRET'),
      expiresIn: this.configService.getOrThrow<string>(
        'JWT_EXPIRES_IN',
      ) as JwtSignOptions['expiresIn'],
    });
  }

  private generateRefreshToken(payload: JwtPayload): Promise<string> {
    return this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('JWT_SECRET_REFRESH'),
      expiresIn: this.configService.getOrThrow<string>(
        'JWT_SECRET_REFRESH_EXPIRES',
      ) as JwtSignOptions['expiresIn'],
    });
  }
  private async hashToken(token: string): Promise<string> {
    return await argon2.hash(token);
  }
  private async issueTokens(
    payload: JwtPayload,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const [accessToken, refreshToken] = await Promise.all([
      this.generateToken(payload),
      this.generateRefreshToken(payload),
    ]);
    const decoded = this.jwtService.decode(refreshToken) as { exp: number };

    const expiresAt = new Date(decoded.exp* 1000);
    const hashedRefreshToken = await this.hashToken(refreshToken);
    await this.db.insert(refresh_tokens).values({
      userId: payload.sub,
      token: hashedRefreshToken,
      userAgent: userAgent || 'Unknown',
      ipAddress: ipAddress || 'Unknown',
      expiresAt,
    });

    return { accessToken, refreshToken };
  }
  async signUp(
    signUpDto: SignUpDto,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<AuthResult> {
    const existingUser = await this.usersService.findByEmail(signUpDto.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }
    const hashedPassword = await argon2.hash(signUpDto.password);

    const user = await this.usersService.create({
      ...signUpDto,
      password: hashedPassword,
    });
    if (!user) {
      throw new InternalServerErrorException('Failed to create user');
    }
    const safeUser = this.usersService.safeUser(user);
    const paylaod: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    const { accessToken, refreshToken } = await this.issueTokens(
      paylaod,
      userAgent,
      ipAddress,
    );

    const result: AuthResult = {
      user: safeUser,
      accessToken,
      refreshToken,
    };

    return result;
  }

  async signIn(
    signInDto: SignInDto,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<AuthResult> {
    const user = await this.usersService.findByEmail(signInDto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const isPasswordValid = await argon2.verify(
      user.password,
      signInDto.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const safeUser = this.usersService.safeUser(user);
    const paylaod: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    const { accessToken, refreshToken } = await this.issueTokens(
      paylaod,
      userAgent,
      ipAddress,
    );

    const result: AuthResult = {
      user: safeUser,
      accessToken,
      refreshToken,
    };

    return result;
  }
  async refresh(
    refreshToken: string,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<AuthResult> {
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.configService.getOrThrow<string>('JWT_SECRET_REFRESH'),
      });
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    const tokenHash = await this.hashToken(refreshToken);
    const [session] = await this.db
      .select()
      .from(refresh_tokens)
      .where(
        and(
          eq(refresh_tokens.userId, payload.sub),
          eq(refresh_tokens.token, tokenHash),
          gt(refresh_tokens.expiresAt, new Date()),
        ),
      );
    if (!session) {
      throw new UnauthorizedException(
        'session has been expired or invalidated',
      );
    }
    await this.db
      .delete(refresh_tokens)
      .where(eq(refresh_tokens.id, session.id));
    const user = await this.usersService.findOne(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    const safeUser = this.usersService.safeUser(user);
    const newPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    const { accessToken, refreshToken: newRefreshToken } =
      await this.issueTokens(newPayload, userAgent, ipAddress);

    const result: AuthResult = {
      user: safeUser,
      accessToken,
      refreshToken: newRefreshToken,
    };

    return result;
  }

  async signOut(
    userId: string,
    refreshToken: string,
  ): Promise<{ message: string }> {
    const tokenHash = await this.hashToken(refreshToken);
    const [session] = await this.db
      .select()
      .from(refresh_tokens)
      .where(
        and(
          eq(refresh_tokens.userId, userId),
          eq(refresh_tokens.token, tokenHash),
        ),
      );
    if (!session) {
      throw new UnauthorizedException(
        'session has been expired or invalidated',
      );
    }
    await this.db
      .delete(refresh_tokens)
      .where(eq(refresh_tokens.id, session.id));
    return { message: 'User has been logged out successfully' };
  }

  async signOutAllSessions(userId: string): Promise<{ message: string }> {
    await this.db
      .delete(refresh_tokens)
      .where(eq(refresh_tokens.userId, userId));
    return {
      message: 'User has been logged out from all sessions successfully',
    };
  }
}
