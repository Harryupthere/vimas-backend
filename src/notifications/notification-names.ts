// Fixed names seeded by the SeedNotificationCategoriesAndTypes migration —
// other modules (orders, users, point-distribution, products,
// reward-mall-products) reference these constants instead of hardcoding
// strings when calling NotificationsService.notifyUser/notifyAllUsers, so a
// typo becomes a compile error instead of a silently-dropped notification.
export const NotificationCategoryName = {
  ORDERS: 'Orders',
  TEAMMATE: 'Teammate',
  POINTS: 'Points',
  PRODUCTS: 'Products',
  REWARD_MALL_PRODUCTS: 'Reward Mall Products',
} as const;

export type NotificationCategoryName =
  (typeof NotificationCategoryName)[keyof typeof NotificationCategoryName];

export const NotificationTypeName = {
  GENERAL: 'General',
  SUCCESS: 'Success',
  ALERT: 'Alert',
} as const;

export type NotificationTypeName =
  (typeof NotificationTypeName)[keyof typeof NotificationTypeName];
