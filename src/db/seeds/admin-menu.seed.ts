import 'dotenv/config';
import { DataSource } from 'typeorm';

import {
  AdminMenu,
  AdminMenuType,
} from '../../shared/entities/admin-menu.entity';
import { Permission } from '../../shared/entities/permission.entity';
import { AdminMenuPermission } from '../../shared/entities/admin-menu-permission.entity';

interface NavSeedItem {
  name: string;
  slug: string;
  icon?: string;
  route?: string;
  is_active?: boolean;
  /**
   * Permission modules (Permission.module) whose actions get attached to
   * this menu. A page with more than one module (e.g. "Point Wallets"
   * covering both admin- and user-side wallet balances) gets every
   * permission from every listed module.
   */
  permissionModules?: string[];
  children?: NavSeedItem[];
}

/**
 * Mirrors the frontend admin panel's NAV_ITEMS. Keep this in sync whenever
 * NAV_ITEMS changes so admin_menus / admin_menu_permissions reflect the
 * actual navigation.
 */
const NAV_SEED: NavSeedItem[] = [
  {
    name: 'Dashboard',
    slug: 'dashboard',
    icon: 'Dashboard',
    route: '/dashboard',
    permissionModules: ['dashboard'],
  },
  {
    name: 'Users',
    slug: 'users',
    icon: 'Users',
    route: '/users',
    permissionModules: ['users'],
  },
  {
    name: 'Catalog',
    slug: 'catalog',
    icon: 'Box',
    children: [
      {
        name: 'Categories',
        slug: 'catalog-categories',
        route: '/catalog/categories',
        permissionModules: ['categories'],
      },
      {
        name: 'Brands',
        slug: 'catalog-brands',
        route: '/catalog/brands',
        permissionModules: ['brands'],
      },
      {
        name: 'Products',
        slug: 'catalog-products',
        route: '/catalog/products',
        permissionModules: ['products'],
      },
      {
        name: 'Product Bulk Details',
        slug: 'catalog-product-bulk-details',
        route: '/catalog/product-bulk-details',
        permissionModules: ['product-bulk-details'],
      },
      {
        name: 'Product Extra Charges',
        slug: 'catalog-product-extra-charges',
        route: '/catalog/product-extra-charges',
        permissionModules: ['product-extra-charges'],
      },
      {
        name: 'Product Add-Ons',
        slug: 'catalog-product-add-ons',
        route: '/catalog/product-add-ons',
        permissionModules: ['product-add-ons'],
      },
      {
        name: 'Product Coupons',
        slug: 'catalog-product-coupons',
        route: '/catalog/product-coupons',
        permissionModules: ['product-coupons'],
      },
      {
        name: 'Product Discounts',
        slug: 'catalog-product-discounts',
        route: '/catalog/product-discounts',
        permissionModules: ['product-discounts'],
      },
      {
        name: 'Product Actions',
        slug: 'catalog-product-actions',
        route: '/catalog/product-actions',
        permissionModules: ['product-actions'],
      },
      {
        name: 'Product Feedback',
        slug: 'catalog-product-feedback',
        route: '/catalog/product-feedback',
        permissionModules: ['product-feedback'],
      },
      {
        name: 'Review & Rating',
        slug: 'catalog-review-rating',
        route: '/catalog/review-rating',
        permissionModules: ['review-rating'],
      },
      {
        name: 'Product History',
        slug: 'catalog-product-history',
        route: '/catalog/product-history',
        permissionModules: ['product-history'],
      },
    ],
  },
  {
    name: 'E-Wallet',
    slug: 'wallet',
    icon: 'Wallet',
    route: '/wallet',
    permissionModules: ['wallet'],
  },
  {
    name: 'Orders',
    slug: 'orders-group',
    icon: 'Cart',
    children: [
      {
        name: 'Orders',
        slug: 'orders',
        route: '/orders',
        permissionModules: ['orders'],
      },
      {
        name: 'Order Status',
        slug: 'orders-order-status',
        route: '/orders/order-status',
        permissionModules: ['order-status'],
      },
      {
        name: 'Payment Status',
        slug: 'orders-payment-status',
        route: '/orders/payment-status',
        permissionModules: ['payment-status'],
      },
      {
        name: 'Payment Options',
        slug: 'orders-payment-options',
        route: '/orders/payment-options',
        permissionModules: ['payment-options'],
      },
    ],
  },
  {
    name: 'Points & Rewards',
    slug: 'points-rewards',
    icon: 'Coins',
    children: [
      {
        name: 'Point Distribution',
        slug: 'points-distribution',
        route: '/points/distribution',
        permissionModules: ['point-distribution'],
      },
      {
        name: 'Point Pools',
        slug: 'points-pools',
        route: '/points/pools',
        permissionModules: ['point-pool'],
      },
      {
        name: 'Point Pool Details',
        slug: 'points-pool-details',
        route: '/points/pool-details',
        permissionModules: ['point-pool-detail'],
      },
      {
        name: 'Point Transactions',
        slug: 'points-transactions',
        route: '/points/transactions',
        permissionModules: ['point-transaction'],
      },
      {
        name: 'Point Wallets',
        slug: 'points-wallets',
        route: '/points/wallets',
        permissionModules: ['point-user-balance', 'point-admin-balance'],
      },
    ],
  },
  {
    name: 'Reward Mall',
    slug: 'reward-mall',
    icon: 'Gift',
    children: [
      {
        name: 'Categories',
        slug: 'reward-mall-categories',
        route: '/reward-mall/categories',
        permissionModules: ['reward-mall-categories'],
      },
      {
        name: 'Products',
        slug: 'reward-mall-products',
        route: '/reward-mall/products',
        permissionModules: ['reward-mall-products'],
      },
      {
        name: 'Purchase Status',
        slug: 'reward-mall-purchase-status',
        route: '/reward-mall/purchase-status',
        permissionModules: ['reward-mall-purchase-status'],
      },
      {
        name: 'Purchases',
        slug: 'reward-mall-purchases',
        route: '/reward-mall/purchases',
        permissionModules: ['reward-mall-purchases'],
      },
    ],
  },
  {
    name: 'Notifications',
    slug: 'notifications-group',
    icon: 'Bell',
    children: [
      {
        name: 'Notifications',
        slug: 'notifications',
        route: '/notifications',
        permissionModules: ['notifications'],
      },
      {
        name: 'Categories',
        slug: 'notifications-categories',
        route: '/notifications/categories',
        permissionModules: ['notification-categories'],
      },
      {
        name: 'Types',
        slug: 'notifications-types',
        route: '/notifications/types',
        permissionModules: ['notification-types'],
      },
    ],
  },
  {
    name: 'Configuration',
    slug: 'configuration',
    icon: 'Settings',
    children: [
      {
        name: 'User Types',
        slug: 'configuration-user-types',
        route: '/configuration/user-types',
        permissionModules: ['user-types'],
      },
      {
        name: 'Membership Types',
        slug: 'configuration-membership-types',
        route: '/configuration/membership-types',
        permissionModules: ['membership-types'],
      },
      {
        name: 'Registration Types',
        slug: 'configuration-registration-types',
        route: '/configuration/registration-types',
        permissionModules: ['registration-types'],
      },
    ],
  },
  {
    name: 'Admin Management',
    slug: 'admin-management',
    icon: 'Shield',
    children: [
      {
        name: 'Admins',
        slug: 'admin-management-admins',
        route: '/admin-management/admins',
        permissionModules: ['admins'],
      },
      {
        name: 'Roles',
        slug: 'admin-management-roles',
        route: '/admin-management/roles',
        permissionModules: ['roles'],
      },
      {
        name: 'Permissions',
        slug: 'admin-management-permissions',
        route: '/admin-management/permissions',
        permissionModules: ['permissions'],
      },
      {
        name: 'Admin Menus',
        slug: 'admin-management-menus',
        route: '/admin-management/menus',
        permissionModules: ['admin-menus'],
      },
    ],
  },
  {
    name: 'Reports',
    slug: 'reports',
    icon: 'Report',
    route: '/reports',
    is_active: false,
  },
  {
    name: 'Settings',
    slug: 'settings',
    icon: 'Settings',
    route: '/settings',
    is_active: false,
  },
  {
    name: 'Profile',
    slug: 'profile',
    icon: 'UserCircle',
    route: '/profile',
  },
];

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
    const menuRepo = dataSource.getRepository(AdminMenu);
    const permissionRepo = dataSource.getRepository(Permission);
    const menuPermissionRepo = dataSource.getRepository(AdminMenuPermission);

    const allPermissions = await permissionRepo.find();
    const permissionsByModule = new Map<string, Permission[]>();
    for (const permission of allPermissions) {
      const list = permissionsByModule.get(permission.module) ?? [];
      list.push(permission);
      permissionsByModule.set(permission.module, list);
    }

    let sortOrder = 0;
    let menuCount = 0;
    let linkCount = 0;

    async function upsertMenu(
      item: NavSeedItem,
      parentId: number | null,
      order: number,
    ): Promise<AdminMenu> {
      const menuType = item.children ? AdminMenuType.GROUP : AdminMenuType.PAGE;

      let menu = await menuRepo.findOne({ where: { slug: item.slug } });

      const attrs = {
        parent_id: parentId ?? undefined,
        name: item.name,
        slug: item.slug,
        route: item.route ?? undefined,
        icon: item.icon ?? undefined,
        menu_type: menuType,
        sort_order: order,
        is_active: item.is_active ?? true,
      };

      if (menu) {
        await menuRepo.update(menu.id, attrs);
        menu = { ...menu, ...attrs } as AdminMenu;
      } else {
        menu = await menuRepo.save(menuRepo.create(attrs));
      }

      menuCount += 1;

      if (item.permissionModules?.length) {
        const permissionIds = item.permissionModules
          .flatMap((module) => permissionsByModule.get(module) ?? [])
          .map((permission) => permission.id);

        if (permissionIds.length) {
          await menuPermissionRepo.delete({ menu_id: menu.id });
          await menuPermissionRepo.insert(
            permissionIds.map((permissionId) => ({
              menu_id: menu.id,
              permission_id: permissionId,
            })),
          );
          linkCount += permissionIds.length;
        }
      }

      if (item.children) {
        for (const [index, child] of item.children.entries()) {
          await upsertMenu(child, menu.id, index);
        }
      }

      return menu;
    }

    for (const item of NAV_SEED) {
      await upsertMenu(item, null, sortOrder);
      sortOrder += 1;
    }

    console.log(`Seeded ${menuCount} admin menus.`);
    console.log(`Linked ${linkCount} menu-permission assignments.`);
  } finally {
    await dataSource.destroy();
  }
}

run()
  .then(() => {
    console.log('Admin menu seeding completed successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Admin menu seeding failed:', error);
    process.exit(1);
  });
