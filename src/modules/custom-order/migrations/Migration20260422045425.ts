import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260422045425 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "custom_order" ("id" text not null, "customer_id" text not null, "title" text not null, "description" text not null, "status" text not null default 'submitted', "admin_reply" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "custom_order_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_custom_order_deleted_at" ON "custom_order" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "custom_order" cascade;`);
  }

}
