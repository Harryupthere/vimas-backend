import 'dotenv/config';
import { DataSource } from 'typeorm';

import { Permission } from '../../shared/entities/permission.entity';
import { extractPermissionsFromControllers, SeedPermission } from './extract-permissions';
import { getManualPermissions } from './manual-permissions';

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
