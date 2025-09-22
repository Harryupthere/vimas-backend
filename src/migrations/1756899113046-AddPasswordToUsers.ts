import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPasswordToUsers1756899113046 implements MigrationInterface {
    name = 'AddPasswordToUsers1756899113046'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`users\` ADD \`password\` varchar(255) default null`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`password\``);
    }

}
