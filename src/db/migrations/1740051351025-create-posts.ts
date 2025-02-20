import { MigrationInterface, QueryRunner } from "typeorm";

export class CreatePosts1740051351025 implements MigrationInterface {
    name = 'CreatePosts1740051351025'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "post" ("id" SERIAL NOT NULL, "title" character varying NOT NULL, "content" character varying NOT NULL, "isActive" boolean DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_be5fda3aac270b134ff9c21cdee" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "post"`);
    }

}
