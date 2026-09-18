import 'dotenv/config';
import { DataSource } from 'typeorm';

import { Permission } from '../../shared/entities/permission.entity';
import { Role } from '../../shared/entities/role.entity';
import { RolePermission } from '../../shared/entities/role-permission.entity';
import { AdminRole } from '../../shared/entities/admin-role.entity';
import { extractPermissionsFromControllers, SeedPermission } from './extract-permissions';
import { getManualPermissions } from './manual-permissions';

const SUPER_ADMIN_ROLE = {
  name: 'Super Admin',
  slug: 'super-admin',
  description: 'Handles whole admin panel',
  is_active: true,
  is_system: true,
};

const SUPER_ADMIN_ID = 1;

async function run() {
  const dataSource = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    entities: [__dirname + '/../../shared/entities/*.entity{.ts,.js}'],
    synchronize: false,
  });

  await dataSource.initialize();

  try {
    const controllerPermissions = await extractPermissionsFromControllers();
    const manualPermissions = getManualPermissions();

    const bySlug = new Map<string, SeedPermission>();
    for (const permission of [...controllerPermissions, ...manualPermissions]) {
      bySlug.set(permission.slug, permission);
    }
    const permissions = [...bySlug.values()].sort((a, b) =>
      a.slug.localeCompare(b.slug),
    );

    if (permissions.length === 0) {
      console.log('No @Permission(...) decorators found. Nothing to seed.');
      return;
    }

    const permissionRepo = dataSource.getRepository(Permission);

    // permissions is referenced by role_permissions / admin_menu_permissions via FK,
    // so FK checks are disabled around the truncate and re-enabled right after.
    await dataSource.query('SET FOREIGN_KEY_CHECKS = 0');
    await permissionRepo.clear();
    await dataSource.query('SET FOREIGN_KEY_CHECKS = 1');

    await permissionRepo.insert(permissions);

    console.log(`Seeded ${permissions.length} permissions:`);
    for (const permission of permissions) {
      console.log(`  - ${permission.slug}`);
    }

    const seededPermissions = await permissionRepo.find();

    const roleRepo = dataSource.getRepository(Role);
    const rolePermissionRepo = dataSource.getRepository(RolePermission);
    const adminRoleRepo = dataSource.getRepository(AdminRole);

    let superAdminRole = await roleRepo.findOne({
      where: { slug: SUPER_ADMIN_ROLE.slug },
    });

    if (superAdminRole) {
      await roleRepo.update(superAdminRole.id, SUPER_ADMIN_ROLE);
    } else {
      superAdminRole = await roleRepo.save(roleRepo.create(SUPER_ADMIN_ROLE));
    }

    await rolePermissionRepo.delete({ role_id: superAdminRole.id });
    await rolePermissionRepo.insert(
      seededPermissions.map((permission) => ({
        role_id: superAdminRole!.id,
        permission_id: permission.id,
      })),
    );

    console.log(
      `Assigned all ${seededPermissions.length} permissions to "${SUPER_ADMIN_ROLE.name}" role.`,
    );

    const existingAdminRole = await adminRoleRepo.findOne({
      where: { admin_id: SUPER_ADMIN_ID, role_id: superAdminRole.id },
    });

    if (!existingAdminRole) {
      await adminRoleRepo.insert({
        admin_id: SUPER_ADMIN_ID,
        role_id: superAdminRole.id,
      });
    }

    console.log(
      `Assigned "${SUPER_ADMIN_ROLE.name}" role to admin id=${SUPER_ADMIN_ID}.`,
    );
  } finally {
    await dataSource.destroy();
  }
}

run()
  .then(() => {
    console.log('Permission seeding completed successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Permission seeding failed:', error);
    process.exit(1);
  });
