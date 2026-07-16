import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedOrderAndPaymentStatus1784136202632
  implements MigrationInterface
{
  name = 'SeedOrderAndPaymentStatus1784136202632';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO \`payment_status\` (\`id\`, \`name\`, \`description\`, \`colour\`) VALUES
      (1, 'Pending', 'Payment not yet completed', '#FFA500'),
      (2, 'Paid', 'Payment completed successfully', '#28A745'),
      (3, 'Failed', 'Payment attempt failed', '#DC3545'),
      (4, 'Refunded', 'Payment was refunded', '#6C757D')
    `);

    await queryRunner.query(`
      INSERT INTO \`order_status\` (\`id\`, \`name\`, \`description\`) VALUES
      (1, 'Pending', 'Order placed, awaiting payment confirmation'),
      (2, 'Confirmed', 'Payment confirmed, order confirmed'),
      (3, 'Shipped', 'Order has been shipped'),
      (4, 'Delivered', 'Order delivered to buyer'),
      (5, 'Cancelled', 'Order cancelled')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM \`order_status\` WHERE id IN (1,2,3,4,5)`,
    );
    await queryRunner.query(
      `DELETE FROM \`payment_status\` WHERE id IN (1,2,3,4)`,
    );
  }
}
