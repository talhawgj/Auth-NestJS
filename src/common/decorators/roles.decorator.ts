import {UserRoleType} from '../../db/schema';
import {SetMetadata} from '@nestjs/common';

export const ROLES_KEY = 'roles';

export const Roles = (...roles: UserRoleType[]) => SetMetadata(ROLES_KEY, roles);