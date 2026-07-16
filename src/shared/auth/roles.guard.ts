import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    // no roles metadata => allow
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const req = context.switchToHttp().getRequest();
    const user = req.user;
    if (!user) throw new ForbiddenException('Unauthenticated');

    // support user.role as string or string[]
    const userRoles: string[] = Array.isArray(user.role)
      ? user.role.map((r: string) => String(r).toLowerCase())
      : [String(user.role).toLowerCase()];

    const allowed = requiredRoles
      .map(r => String(r).toLowerCase())
      .some(r => userRoles.includes(r));

    if (allowed) return true;

    throw new ForbiddenException('Insufficient permissions');
  }
}