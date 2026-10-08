import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectDrizzle } from '@nestjs/drizzle';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { users, type User, UserRoleType, refresh_tokens } from '../db/schema';
import { eq } from 'drizzle-orm';
import { SafeUser } from './types/safeuser';
import * as argon2 from "argon2";
@Injectable()
export class UsersService {
  constructor(@InjectDrizzle() private readonly db: NodePgDatabase) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const [newUser] = await this.db
      .insert(users)
      .values({
        email: createUserDto.email,
        firstName: createUserDto.firstName,
        lastName: createUserDto.lastName,
        password: createUserDto.password,
        role: createUserDto.role,
      })
      .returning();
    return newUser;
  }

  findAll(): Promise<User[]> {
    return this.db.select().from(users);
  }
  async findOne(id: string): Promise<User> {
    return await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .then((rows) => rows[0]);
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const [user] = await this.db
      .update(users)
      .set(updateUserDto)
      .where(eq(users.id, id))
      .returning();
    return user;
  }
  async updateRole(id: string, role: UserRoleType): Promise<User> {
    const [user] = await this.db
      .update(users)
      .set({ role })
      .where(eq(users.id, id))
      .returning();
    return user;
  }
  async remove(id: string): Promise<void> {
    await this.db.delete(users).where(eq(users.id, id));
  }
  async findByEmail(email: string) {
    const user = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .then((rows) => rows[0]);
    return user;
  }
  async updatePassword(id: string, password: string) {
    return await this.db
      .update(users)
      .set({ password })
      .where(eq(users.id, id))
      .returning();
  }
  safeUser(user: User): SafeUser {
    const { password, ...safeUser } = user;

    return safeUser;
  }

  async changePassword(id: string, oldPassword: string, newPassword: string) {
    const user = await this.findOne(id);
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    const isOldPasswordValid = await argon2.verify(user.password, oldPassword);
    if (!isOldPasswordValid) {
      throw new UnauthorizedException('Old password is incorrect');
    }

    const hashedNewPassword = await argon2.hash(newPassword);
    await this.updatePassword(id, hashedNewPassword);
    await this.db.delete(refresh_tokens).where(eq(refresh_tokens.userId, id));
    return { message: 'Password changed successfully' };
  }
}
