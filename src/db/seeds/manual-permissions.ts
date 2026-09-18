import { SeedPermission, slugToPermission } from './extract-permissions';

/**
 * Permissions for controllers that don't (yet) carry `@Permission(...)`
 * decorators, so they can't be picked up by extractPermissionsFromControllers().
 *
 * - dashboard.*   -> dashboard view-only access, not tied to a specific controller.
 * - roles.*       -> src/roles/role.controller.ts
 * - permissions.* -> src/permission/permission.controller.ts
 * - admins.*      -> shared by src/admin-role/admin-role.controller.ts and
 *                    src/role-permission/role-permission.controller.ts, both of
 *                    which manage admin access and are gated by one admins permission.
 * - admin-menus.* -> src/admin-menu/admin-menu.controller.ts and
 *                    src/admin-menu-permission/admin-menu-permission.controller.ts,
 *                    neither of which live under an `admin/` folder so they
 *                    aren't picked up by extractPermissionsFromControllers().
 */
const MANUAL_SLUGS = [
  'dashboard.view',

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

  'admin-menus.create',
  'admin-menus.view',
  'admin-menus.update',
  'admin-menus.delete',
];

export function getManualPermissions(): SeedPermission[] {
  return MANUAL_SLUGS.map(slugToPermission);
}
