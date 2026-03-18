import 'reflect-metadata';
import { AppDataSource } from '../src/config/data-source';
import { Role } from '../src/modules/roles/entities/role.entity';
import { Permission } from '../src/modules/permissions/entities/permission.entity';
import { RolePermission } from '../src/modules/role-permissions/entities/role-permission.entity';
import { RoleEnum } from '../src/modules/roles/role.enum';
import { PermissionActionEnum } from '../src/common/enums/permission-actions.enum';

// ============================================================================
// SEED FILE 2 — Role-Based Permission Assignment
// ============================================================================
// Creates business_owner and visitor roles (if they don't exist) and assigns
// contextually appropriate permissions to each:
//
//   business_owner — Full CRUD on their own business data (listings,
//     socials, hours, gallery, services, products, branches). Read-only
//     access to categories, cities. Can view own reviews and respond.
//     Can view own dashboard & analytics. No system-level access.
//
//   visitor — Read-only access to all public resources (businesses,
//     categories, cities, reviews). Can create reviews (leave feedback).
//     No access to admin, settings, or management features.
//
// Uses upsert logic — safe to run multiple times without duplicates.
// ============================================================================

/**
 * Permission assignments per role.
 * Each entry maps a resource to the specific actions that role should have.
 */
const BUSINESS_OWNER_PERMISSIONS: Record<string, PermissionActionEnum[]> = {
  // Own business management — full control
  businesses: [
    PermissionActionEnum.CREATE,
    PermissionActionEnum.READ,
    PermissionActionEnum.UPDATE,
    PermissionActionEnum.DELETE,
    PermissionActionEnum.VIEW_OWN,
    PermissionActionEnum.PUBLISH,
    PermissionActionEnum.ARCHIVE,
    PermissionActionEnum.RESTORE,
  ],

  // Business sub-resources — full CRUD (owner manages their own data)
  business_socials: [
    PermissionActionEnum.CREATE,
    PermissionActionEnum.READ,
    PermissionActionEnum.UPDATE,
    PermissionActionEnum.DELETE,
  ],
  business_hours: [
    PermissionActionEnum.CREATE,
    PermissionActionEnum.READ,
    PermissionActionEnum.UPDATE,
    PermissionActionEnum.DELETE,
  ],
  business_gallery: [
    PermissionActionEnum.CREATE,
    PermissionActionEnum.READ,
    PermissionActionEnum.UPDATE,
    PermissionActionEnum.DELETE,
  ],
  business_services: [
    PermissionActionEnum.CREATE,
    PermissionActionEnum.READ,
    PermissionActionEnum.UPDATE,
    PermissionActionEnum.DELETE,
  ],
  business_products: [
    PermissionActionEnum.CREATE,
    PermissionActionEnum.READ,
    PermissionActionEnum.UPDATE,
    PermissionActionEnum.DELETE,
  ],
  business_branches: [
    PermissionActionEnum.CREATE,
    PermissionActionEnum.READ,
    PermissionActionEnum.UPDATE,
    PermissionActionEnum.DELETE,
  ],

  // Public data — read-only for browsing
  categories: [PermissionActionEnum.READ],
  cities: [PermissionActionEnum.READ],

  // Reviews — view own reviews (customers' feedback on their business)
  reviews: [
    PermissionActionEnum.READ,
    PermissionActionEnum.VIEW_OWN,
  ],

  // Dashboard — view own analytics
  dashboard: [
    PermissionActionEnum.READ,
    PermissionActionEnum.ANALYZE,
    PermissionActionEnum.REPORT,
  ],

  // Users — manage own profile only
  users: [
    PermissionActionEnum.READ,
    PermissionActionEnum.UPDATE,
    PermissionActionEnum.VIEW_OWN,
  ],

  // Subscriptions — view/manage own subscriptions
  subscriptions: [
    PermissionActionEnum.READ,
    PermissionActionEnum.VIEW_OWN,
  ],
  payments: [
    PermissionActionEnum.READ,
    PermissionActionEnum.VIEW_OWN,
  ],

  // Business cards & media — full control for own businesses
  business_cards: [
    PermissionActionEnum.CREATE,
    PermissionActionEnum.READ,
    PermissionActionEnum.UPDATE,
    PermissionActionEnum.DELETE,
  ],
  business_media: [
    PermissionActionEnum.CREATE,
    PermissionActionEnum.READ,
    PermissionActionEnum.UPDATE,
    PermissionActionEnum.DELETE,
  ],

  // Countries — read-only for browsing
  countries: [PermissionActionEnum.READ],
};

const VISITOR_PERMISSIONS: Record<string, PermissionActionEnum[]> = {
  // Public browsing — read-only access to directory
  businesses: [PermissionActionEnum.READ],
  categories: [PermissionActionEnum.READ],
  cities: [PermissionActionEnum.READ],

  // Reviews — can read all reviews and create new ones (leave feedback)
  reviews: [
    PermissionActionEnum.CREATE,
    PermissionActionEnum.READ,
  ],

  // Users — view own profile only
  users: [
    PermissionActionEnum.VIEW_OWN,
  ],

  // Business sub-resources — read-only (view details on listings)
  business_socials: [PermissionActionEnum.READ],
  business_hours: [PermissionActionEnum.READ],
  business_gallery: [PermissionActionEnum.READ],
  business_services: [PermissionActionEnum.READ],
  business_products: [PermissionActionEnum.READ],
  business_branches: [PermissionActionEnum.READ],

  // Countries — read-only for browsing
  countries: [PermissionActionEnum.READ],

  // Subscription plans — can view available plans
  subscription_plans: [PermissionActionEnum.READ],

  // Business cards & media — read-only
  business_cards: [PermissionActionEnum.READ],
  business_media: [PermissionActionEnum.READ],
};

/**
 * Helper: Ensures a role exists and assigns the specified permissions to it.
 * Uses upsert logic for both role creation and permission assignment.
 */
async function assignPermissionsToRole(
  roleName: string,
  roleDescription: string,
  permissionMap: Record<string, PermissionActionEnum[]>,
): Promise<void> {
  const roleRepo = AppDataSource.getRepository(Role);
  const permissionRepo = AppDataSource.getRepository(Permission);
  const rolePermissionRepo = AppDataSource.getRepository(RolePermission);

  // ── Create or find the role ────────────────────────────────────────────
  let role = await roleRepo.findOne({ where: { name: roleName } });

  if (!role) {
    role = roleRepo.create({ name: roleName, description: roleDescription });
    await roleRepo.save(role);
    console.log(`   ✅ Role "${roleName}" created.`);
  } else {
    console.log(`   ℹ️  Role "${roleName}" already exists.`);
  }

  // ── Assign permissions ─────────────────────────────────────────────────
  let assignedCount = 0;
  let skippedCount = 0;
  let notFoundCount = 0;

  for (const [resource, actions] of Object.entries(permissionMap)) {
    for (const action of actions) {
      const permName = `${resource}.${action}`;

      // Find the permission (should have been created by Seed 1)
      const permission = await permissionRepo.findOne({
        where: { name: permName },
      });

      if (!permission) {
        console.log(`   ⚠️  Permission "${permName}" not found — skipping.`);
        notFoundCount++;
        continue;
      }

      // Upsert: check if assignment already exists
      const existing = await rolePermissionRepo.findOne({
        where: {
          roleId: role.id,
          permissionId: permission.id,
        },
      });

      if (!existing) {
        const rolePermission = rolePermissionRepo.create({
          roleId: role.id,
          permissionId: permission.id,
        });
        await rolePermissionRepo.save(rolePermission);
        assignedCount++;
      } else {
        skippedCount++;
      }
    }
  }

  console.log(
    `   📊 ${roleName}: ${assignedCount} assigned, ${skippedCount} already existed` +
      (notFoundCount > 0 ? `, ${notFoundCount} not found` : ''),
  );
}

/**
 * Seed 2: Creates business_owner & visitor roles and assigns appropriate permissions.
 * Expects AppDataSource to be already initialized and Seed 1 to have run first.
 */
export async function seedRolePermissions(): Promise<void> {
  try {
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  SEED 2 — Role-Based Permission Assignment');
    console.log('═══════════════════════════════════════════════════════════');

    // ── business_owner role ──────────────────────────────────────────────
    console.log('\n🏢 Setting up business_owner role...');
    await assignPermissionsToRole(
      RoleEnum.BUSINESS_OWNER,
      'Business owner with full control over their own business listings and data',
      BUSINESS_OWNER_PERMISSIONS,
    );

    // ── visitor role ─────────────────────────────────────────────────────
    console.log('\n👀 Setting up visitor role...');
    await assignPermissionsToRole(
      RoleEnum.VISITOR,
      'Public visitor with read-only access to directory and ability to leave reviews',
      VISITOR_PERMISSIONS,
    );

    console.log('\n🎉 Seed 2 completed successfully!\n');
  } catch (error) {
    console.error('❌ Seed 2 failed:', error.message);
    throw error;
  }
}

// ── Standalone execution ─────────────────────────────────────────────────────
// Allows running this seed independently: ts-node seeds/seed-role-permissions.ts
if (require.main === module) {
  AppDataSource.initialize()
    .then(async () => {
      await seedRolePermissions();
      await AppDataSource.destroy();
      console.log('🆑 Database connection closed.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Failed to initialize database:', error);
      process.exit(1);
    });
}
