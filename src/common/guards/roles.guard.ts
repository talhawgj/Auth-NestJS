import {ExecutionContext, Injectable, CanActivate,ForbiddenException} from '@nestjs/common';
import {Reflector} from '@nestjs/core';
import {ROLES_KEY} from '../decorators/roles.decorator';
import type {UserRoleType} from '../../db/schema';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRoleType[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles) {
      return true;
    }
    const {user} = context.switchToHttp().getRequest();
    if (requiredRoles.includes(user?.role)) {
      return true;
    }
    throw new ForbiddenException('Insufficient permissions');
  }
}  