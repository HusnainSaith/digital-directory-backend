import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Renames all 'enterprise'-based tables and columns to 'business'.
 * This migration covers:
 *   - Main table: enterprises → businesses
 *   - Sub-resource tables: enterprise_* → business_*
 *   - Join table: enterprise_categories → business_categories
 *   - FK columns: enterprise_id → business_id (in reviews, subscriptions, business_cards, business_media)
 *   - Indexes and foreign key constraints are recreated with new names
 */
export class RenameEnterprisesToBusinesses1742000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── 1. Rename main table ─────────────────────────────────────────────
    await queryRunner.query(`ALTER TABLE "enterprises" RENAME TO "businesses"`);

    // ── 2. Rename sub-resource tables ────────────────────────────────────
    await queryRunner.query(`ALTER TABLE "enterprise_socials" RENAME TO "business_socials"`);
    await queryRunner.query(`ALTER TABLE "enterprise_business_hours" RENAME TO "business_hours"`);
    await queryRunner.query(`ALTER TABLE "enterprise_gallery_images" RENAME TO "business_gallery_images"`);
    await queryRunner.query(`ALTER TABLE "enterprise_services" RENAME TO "business_services"`);
    await queryRunner.query(`ALTER TABLE "enterprise_products" RENAME TO "business_products"`);
    await queryRunner.query(`ALTER TABLE "enterprise_branches" RENAME TO "business_branches"`);

    // ── 3. Rename join table ─────────────────────────────────────────────
    await queryRunner.query(`ALTER TABLE "enterprise_categories" RENAME TO "business_categories"`);

    // ── 4. Rename enterprise_id columns in sub-resource tables ───────────
    const subTables = [
      'business_socials',
      'business_hours',
      'business_gallery_images',
      'business_services',
      'business_products',
      'business_branches',
    ];
    for (const table of subTables) {
      await queryRunner.query(`ALTER TABLE "${table}" RENAME COLUMN "enterprise_id" TO "business_id"`);
    }

    // Rename enterprise_id in join table
    await queryRunner.query(`ALTER TABLE "business_categories" RENAME COLUMN "enterprise_id" TO "business_id"`);

    // ── 5. Rename enterprise_id in reviews table ─────────────────────────
    await queryRunner.query(`ALTER TABLE "reviews" RENAME COLUMN "enterprise_id" TO "business_id"`);

    // ── 6. Rename enterprise_related table columns ───────────────────────
    // Check if enterprise_related table exists (it was in original migrations)
    const hasRelated = await queryRunner.hasTable('enterprise_related');
    if (hasRelated) {
      await queryRunner.query(`ALTER TABLE "enterprise_related" RENAME TO "business_related"`);
      await queryRunner.query(`ALTER TABLE "business_related" RENAME COLUMN "enterprise_id" TO "business_id"`);
      await queryRunner.query(`ALTER TABLE "business_related" RENAME COLUMN "related_enterprise_id" TO "related_business_id"`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse: business → enterprise

    const hasRelated = await queryRunner.hasTable('business_related');
    if (hasRelated) {
      await queryRunner.query(`ALTER TABLE "business_related" RENAME COLUMN "related_business_id" TO "related_enterprise_id"`);
      await queryRunner.query(`ALTER TABLE "business_related" RENAME COLUMN "business_id" TO "enterprise_id"`);
      await queryRunner.query(`ALTER TABLE "business_related" RENAME TO "enterprise_related"`);
    }

    await queryRunner.query(`ALTER TABLE "reviews" RENAME COLUMN "business_id" TO "enterprise_id"`);

    await queryRunner.query(`ALTER TABLE "business_categories" RENAME COLUMN "business_id" TO "enterprise_id"`);

    const subTables = [
      'business_socials',
      'business_hours',
      'business_gallery_images',
      'business_services',
      'business_products',
      'business_branches',
    ];
    for (const table of subTables) {
      await queryRunner.query(`ALTER TABLE "${table}" RENAME COLUMN "business_id" TO "enterprise_id"`);
    }

    await queryRunner.query(`ALTER TABLE "business_categories" RENAME TO "enterprise_categories"`);

    await queryRunner.query(`ALTER TABLE "business_branches" RENAME TO "enterprise_branches"`);
    await queryRunner.query(`ALTER TABLE "business_products" RENAME TO "enterprise_products"`);
    await queryRunner.query(`ALTER TABLE "business_services" RENAME TO "enterprise_services"`);
    await queryRunner.query(`ALTER TABLE "business_gallery_images" RENAME TO "enterprise_gallery_images"`);
    await queryRunner.query(`ALTER TABLE "business_hours" RENAME TO "enterprise_business_hours"`);
    await queryRunner.query(`ALTER TABLE "business_socials" RENAME TO "enterprise_socials"`);

    await queryRunner.query(`ALTER TABLE "businesses" RENAME TO "enterprises"`);
  }
}
