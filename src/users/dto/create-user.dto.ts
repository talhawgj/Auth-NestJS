import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { USER_ROLES, type UserRoleType } from '../../db/schema';
export class CreateUserDto {
  @IsEmail()
  email: string;
  @IsNotEmpty()
  firstName: string;
  @IsString()
  lastName: string;
  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsOptional()
  @IsIn(USER_ROLES)
  role?: UserRoleType;
}
