import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdatePost1703064124620 implements MigrationInterface {
  name = 'UpdatePost1703064124620';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "post" ADD "content" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "post" ADD "isActive" boolean NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "post" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "post" ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "post" DROP COLUMN "updated_at"`);
    await queryRunner.query(`ALTER TABLE "post" DROP COLUMN "createdAt"`);
    await queryRunner.query(`ALTER TABLE "post" DROP COLUMN "isActive"`);
    await queryRunner.query(`ALTER TABLE "post" DROP COLUMN "content"`);
  }
}
