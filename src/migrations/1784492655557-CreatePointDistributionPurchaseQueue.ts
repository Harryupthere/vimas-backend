import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePointDistributionPurchaseQueue1784492655557
  implements MigrationInterface
{
  name = 'CreatePointDistributionPurchaseQueue1784492655557';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS point_distribution_purchase_queue (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          user_id BIGINT UNSIGNED NOT NULL,
          order_id BIGINT UNSIGNED NOT NULL,
          product_id BIGINT UNSIGNED NOT NULL,
          quantity INT NOT NULL,
          total_points DECIMAL(18,4) NOT NULL DEFAULT 0,
          remaining_points DECIMAL(18,4) NOT NULL DEFAULT 0,
          status ENUM('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
          stage ENUM('created','buyer_reward','level1_reward','level2_reward','pool_reward','completed') NOT NULL DEFAULT 'created',
          retry_count INT NOT NULL DEFAULT 0,
          error TEXT NULL,
          last_attempt_at DATETIME NULL,
          processed_at DATETIME NULL,
          created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY(id),
          UNIQUE KEY uq_pdpq_order (order_id),
          KEY idx_pdpq_user (user_id),
          KEY idx_pdpq_product (product_id),
          KEY idx_pdpq_status_stage (status, stage),
          CONSTRAINT fk_pdpq_user FOREIGN KEY(user_id) REFERENCES users(id),
          CONSTRAINT fk_pdpq_order FOREIGN KEY(order_id) REFERENCES orders(id),
          CONSTRAINT fk_pdpq_product FOREIGN KEY(product_id) REFERENCES products(id)
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TABLE IF EXISTS point_distribution_purchase_queue`,
    );
  }
}
