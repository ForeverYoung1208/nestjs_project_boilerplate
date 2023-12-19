import { MigrationInterface, QueryRunner } from 'typeorm';

export class TestMigration1702997747443 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "post" (
        "id" SERIAL NOT NULL,
        "title" character varying NOT NULL,
        CONSTRAINT "PK_post_id" PRIMARY KEY ("id")
      )`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "post"`);
  }
}
