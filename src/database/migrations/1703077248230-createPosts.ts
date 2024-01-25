import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePosts1703077248230 implements MigrationInterface {
  name = 'CreatePosts1703077248230';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `create table "post" (
        "id" SERIAL not null,
        "title" character varying not null,
        "content" character varying not null,
        "isActive" boolean default true,
        "createdAt" TIMESTAMP not null default now(),
        "updated_at" TIMESTAMP not null default now(),
        constraint "PK_post_id" primary key ("id")
      )
    `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "post"`);
  }
}
