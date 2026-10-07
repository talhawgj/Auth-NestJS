import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { SignUpDto } from './dto/signup.dto';
import { SignInDto } from './dto/signin.dto';
import { UsersService } from '../users/users.service';
import argon2 from 'argon2';

@Injectable()
export class AuthService {
  constructor(private readonly usersService: UsersService) {}

  async signUp(signUpDto: SignUpDto) {
    const existingUser = await this.usersService.findByEmail(signUpDto.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }
    const hashedPassword = await argon2.hash(signUpDto.password);
    
    const user = await this.usersService.create({ ...signUpDto, password: hashedPassword });
    if (!user) {
      throw new InternalServerErrorException('Failed to create user');
    }
    const safeUser = this.usersService.safeUser(user);
    return safeUser;
  }

  async signIn(signInDto: SignInDto) {
    const user = await this.usersService.findByEmail(signInDto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const isPasswordValid = await argon2.verify(user.password, signInDto.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const safeUser = this.usersService.safeUser(user);
    return safeUser;
  }
}
