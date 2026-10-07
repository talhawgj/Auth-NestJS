import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectDrizzle } from '@nestjs/drizzle';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { users,type User,type NewUser } from '../db/schema';
import {eq} from 'drizzle-orm';
@Injectable()
export class UsersService {
  constructor(@InjectDrizzle() private readonly db: NodePgDatabase) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const [newUser]= await this.db.insert(users).values({
    email: createUserDto.email,
    firstName: createUserDto.firstName,
    lastName: createUserDto.lastName,
    password: createUserDto.password,
    role: createUserDto.role
    }).returning();
    return newUser;
  }

  findAll(): Promise<User[]> {
    return this.db.select().from(users);
  }
  async findOne(id: string): Promise<User> {
    return await this.db.select().from(users).where(eq(users.id, id)).then((rows) => rows[0]);
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const [user] = await this.db.update(users).set(updateUserDto).where(eq(users.id, id)).returning()
    return user;
  }
  
  async remove(id: string): Promise<void> {
    await this.db.delete(users).where(eq(users.id, id));
  }
  async findByEmail(email: string) {
    const user = await this.db.select().from(users).where(eq(users.email, email)).then((rows) => rows[0]);
    return user;
  }
  async updatePassword(id: string, password: string) {
    return await this.db.update(users).set({ password }).where(eq(users.id, id)).returning();
  }
  safeUser(user: User){
    const { password, ...safeUser } = user;
    return safeUser;
  }
}
