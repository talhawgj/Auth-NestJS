
import { IsIn, IsNotEmpty } from 'class-validator';
import { USER_ROLES, type UserRoleType } from '../../db/schema';

export class UpdateRoleDto {
  @IsNotEmpty()
  @IsIn(USER_ROLES)
  role: UserRoleType;
}