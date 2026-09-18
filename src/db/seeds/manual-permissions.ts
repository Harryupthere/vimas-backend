import { SeedPermission, slugToPermission } from './extract-permissions';

/**
 * Permissions for controllers that don't (yet) carry `@Permission(...)`
 * decorators, so they can't be picked up by extractPermissionsFromControllers().
 *
 * - roles.*       -> src/roles/role.controller.ts
 * - permissions.* -> src/permission/permission.controller.ts
 * - admins.*      -> shared by src/admin-role/admin-role.controller.ts and
 *                    src/role-permission/role-permission.controller.ts, both of
 *                    which manage admin access and are gated by one admins permission.
 */
const MANUAL_SLUGS = [
  'roles.create',
  'roles.view',
  'roles.update',
  'roles.delete',

  'permissions.create',
  'permissions.view',
  'permissions.update',
  'permissions.delete',

  'admins.create',
  'admins.view',
  'admins.update',
  'admins.delete',
];

export function getManualPermissions(): SeedPermission[] {
  return MANUAL_SLUGS.map(slugToPermission);
}
