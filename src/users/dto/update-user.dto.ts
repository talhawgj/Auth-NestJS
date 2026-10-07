import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { IsEnum, IsIn, IsOptional } from 'class-validator';
import { USER_ROLES, type UserRoleType } from '../../db/schema';
export class UpdateUserDto extends PartialType(OmitType(CreateUserDto, ['password'] as const)) {
 @IsOptional()
  @IsIn(USER_ROLES)
  role?: UserRoleType;   
}
