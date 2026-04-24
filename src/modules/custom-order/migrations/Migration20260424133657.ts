import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260424133657 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "custom_order" add column if not exists "attachments" jsonb null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "custom_order" drop column if exists "attachments";`);
  }

}
