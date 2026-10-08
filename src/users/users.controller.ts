import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  NotFoundException,
  HttpCode,
  HttpStatus,
  ConflictException,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import argon2 from 'argon2';

import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@UseGuards(RolesGuard) // Apply the RolesGuard to the entire controller
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async findMe(@Request() req: any) {
    return req.user; // Return the authenticated user's information
  }

  @Roles('admin') // Only allow users with the 'admin' role to access this endpoint
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createUserDto: CreateUserDto) {
    const existingUser = await this.usersService.findByEmail(
      createUserDto.email,
    );
    if (existingUser) {
      throw new ConflictException(
        `User with email ${createUserDto.email} already exists`,
      );
    }

    const hashPassword = await argon2.hash(createUserDto.password);
    const newUser = await this.usersService.create({
      ...createUserDto,
      password: hashPassword,
    });
    return this.usersService.safeUser(newUser);
  }

  @Roles('admin') // Only allow users with the 'admin' role to access this endpoint
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll() {
    const users = await this.usersService.findAll();
    const safeUsers = users.map((user) => this.usersService.safeUser(user));
    return safeUsers;
  }

  @Roles('admin') // Only allow users with the 'admin' role to access this endpoint
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) {
    const user = await this.usersService.findOne(id);

    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    return this.usersService.safeUser(user);
  }

  @Patch('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(

    @Body() changePasswordDto: ChangePasswordDto,
    @Request() req: any,
  ) {
    const { oldPassword, newPassword } = changePasswordDto;
    await this.usersService.changePassword(
      req.user.id,
      oldPassword,
      newPassword,
    );
    return { message: 'Password changed successfully' };
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Request() req: any,
  ) {
    if (req.user.id !== id && req.user.role !== 'admin') {
      throw new ForbiddenException(
        'You can only update your own information.',
      );
    }
    const existingUser = await this.usersService.findOne(id);
    if (!existingUser) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    const user = await this.usersService.update(id, updateUserDto);
    return this.usersService.safeUser(user);
  }

  @Roles('admin') // Only allow users with the 'admin' role to access this endpoint
  @Patch(':id/role')
  @HttpCode(HttpStatus.OK)
  async updateRole(
    @Param('id') id: string,
    @Body() updateRoleDto: UpdateRoleDto,
  ) {
    const existingUser = await this.usersService.findOne(id);
    if (!existingUser) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    const user = await this.usersService.updateRole(id, updateRoleDto.role);
    return this.usersService.safeUser(user);
  }

  @Roles('admin') // Only allow users with the 'admin' role to access this endpoint
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.usersService.remove(id);
  }
}
