import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  UnauthorizedException,
  Options,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { JwtSignOptions } from '@nestjs/jwt';
import { SignUpDto } from './dto/signup.dto';
import { SignInDto } from './dto/signin.dto';
import { UsersService } from '../users/users.service';
import argon2 from 'argon2';
import type { JwtPayload } from './types/jwt-payload';
import type {AuthResult} from './types/auth-results'
import { Result } from 'pg';
@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private generateToken(payload:JwtPayload):Promise<string>{
    return this.jwtService.signAsync(payload,{
      secret: this.configService.getOrThrow<string>('JWT_SECRET'),
      expiresIn:this.configService.getOrThrow<string>('JWT_EXPIRES_IN') as JwtSignOptions['expiresIn']
    })
  }

  private generateRefreshToken(payload:JwtPayload):Promise<string>{
    return this.jwtService.signAsync(payload,{
      secret: this.configService.getOrThrow<string>('JWT_SECRET_REFRESH'),
      expiresIn:this.configService.getOrThrow<string>('JWT_SECRET_REFRESH_EXPIRES') as JwtSignOptions['expiresIn']
    })
  }

  private async issueTokens(payload:JwtPayload):Promise<{
    accessToken:string,
    refreshToken:string
  }>{
    const [accessToken, refreshToken]= await Promise.all([
      this.generateToken(payload),
      this.generateRefreshToken(payload)
    ]
    );
    return {accessToken, refreshToken}
  }
  async signUp(signUpDto: SignUpDto): Promise<AuthResult> {
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
    const paylaod:JwtPayload= {
      sub:user.id,
      email:user.email,
      role:user.role
    }
    const {accessToken,refreshToken}= await this.issueTokens(paylaod)
    
    const result: AuthResult ={
      user:safeUser,
      accessToken,
      refreshToken
    }
    
    return result
  }

  async signIn(signInDto: SignInDto): Promise<AuthResult> {
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
    const paylaod:JwtPayload= {
      sub:user.id,
      email:user.email,
      role:user.role
    }
    const {accessToken,refreshToken}= await this.issueTokens(paylaod)
    
    const result: AuthResult ={
      user:safeUser,
      accessToken,
      refreshToken
    }
    
    return result
  }
}
