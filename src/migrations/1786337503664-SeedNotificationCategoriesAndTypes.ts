import { MigrationInterface, QueryRunner } from 'typeorm';

// The notification_categories/notification_types/notifications/
// notification_preferences TABLES themselves were already created directly
// against the DB (see Vimas-club-latest.sql) — this migration only seeds
// the fixed-id rows that the rest of the codebase references by id when it
// auto-generates notifications (orders, referrals, points, products,
// reward mall products).
export class SeedNotificationCategoriesAndTypes1786337503664
  implements MigrationInterface
{
  name = 'SeedNotificationCategoriesAndTypes1786337503664';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO \`notification_categories\`
        (\`id\`, \`name\`, \`description\`, \`status\`, \`user_preference\`) VALUES
      (1, 'Orders', 'Updates about your orders: placed, confirmed, shipped, delivered.', 1, true),
      (2, 'Teammate', 'When someone joins your team using your referral.', 1, true),
      (3, 'Points', 'When you earn points from purchases or team activity.', 1, true),
      (4, 'Products', 'New products and product updates.', 1, true),
      (5, 'Reward Mall Products', 'New reward mall products and updates.', 1, true)
    `);

    await queryRunner.query(`
      INSERT INTO \`notification_types\`
        (\`id\`, \`name\`, \`description\`, \`primary_color\`, \`secondary_color\`, \`status\`) VALUES
      (1, 'General', 'Default informational notification', '#2563EB', '#DBEAFE', 1),
      (2, 'Success', 'A positive event: earned points, confirmed order, etc.', '#16A34A', '#DCFCE7', 1),
      (3, 'Alert', 'Something needs attention', '#DC2626', '#FEE2E2', 1)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM \`notification_types\` WHERE id IN (1,2,3)`,
    );
    await queryRunner.query(
      `DELETE FROM \`notification_categories\` WHERE id IN (1,2,3,4,5)`,
    );
  }
}
