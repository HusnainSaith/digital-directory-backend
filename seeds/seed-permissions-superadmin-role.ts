import 'reflect-metadata';
import { AppDataSource } from '../src/config/data-source';
import { Role } from '../src/modules/roles/entities/role.entity';
import { Permission } from '../src/modules/permissions/entities/permission.entity';
import { RolePermission } from '../src/modules/role-permissions/entities/role-permission.entity';
import { RoleEnum } from '../src/modules/roles/role.enum';
import { PermissionActionEnum } from '../src/common/enums/permission-actions.enum';

// ============================================================================
// SEED FILE 1 — Permissions & Super Admin Role Setup
// ============================================================================
// This seed creates all permissions based on every resource/module in the
// database, creates the super_admin role (if it doesn't exist), and assigns
// ALL permissions to it. Uses upsert logic to be idempotent (safe to re-run).
// ============================================================================

/**
 * Complete permission definitions for every resource/module in the system.
 * Follows the naming convention: resource.action (e.g. users.create)
 */
const RESOURCE_PERMISSIONS: Record<
  string,
  { description: string; actions: PermissionActionEnum[] }
> = {
  // ── Auth & Access Control ──────────────────────────────────────────────
  users: {
    description: 'User management',
    actions: [
      PermissionActionEnum.CREATE,
      PermissionActionEnum.READ,
      PermissionActionEnum.UPDATE,
      PermissionActionEnum.DELETE,
      PermissionActionEnum.VIEW_ALL,
      PermissionActionEnum.VIEW_OWN,
      PermissionActionEnum.ASSIGN,
      PermissionActionEnum.EXPORT,
      PermissionActionEnum.MANAGE,
    ],
  },
  roles: {
    description: 'Role management',
    actions: [
      PermissionActionEnum.CREATE,
      PermissionActionEnum.READ,
      PermissionActionEnum.UPDATE,
      PermissionActionEnum.DELETE,
      PermissionActionEnum.ASSIGN,
      PermissionActionEnum.MANAGE,
    ],
  },
  permissions: {
    description: 'Permission management',
    actions: [
      PermissionActionEnum.CREATE,
      PermissionActionEnum.READ,
      PermissionActionEnum.UPDATE,
      PermissionActionEnum.DELETE,
      PermissionActionEnum.ASSIGN,
      PermissionActionEnum.MANAGE,
    ],
  },

  // ── Business Directory — Core Resources ────────────────────────────────
  businesses: {
    description: 'Business listing management',
    actions: [
      PermissionActionEnum.CREATE,
      PermissionActionEnum.READ,
      PermissionActionEnum.UPDATE,
      PermissionActionEnum.DELETE,
      PermissionActionEnum.VIEW_ALL,
      PermissionActionEnum.VIEW_OWN,
      PermissionActionEnum.APPROVE,
      PermissionActionEnum.REJECT,
      PermissionActionEnum.PUBLISH,
      PermissionActionEnum.ARCHIVE,
      PermissionActionEnum.RESTORE,
      PermissionActionEnum.EXPORT,
      PermissionActionEnum.MANAGE,
    ],
  },
  categories: {
    description: 'Business category management',
    actions: [
      PermissionActionEnum.CREATE,
      PermissionActionEnum.READ,
      PermissionActionEnum.UPDATE,
      PermissionActionEnum.DELETE,
      PermissionActionEnum.MANAGE,
    ],
  },
  cities: {
    description: 'City/location management',
    actions: [
      PermissionActionEnum.CREATE,
      PermissionActionEnum.READ,
      PermissionActionEnum.UPDATE,
      PermissionActionEnum.DELETE,
      PermissionActionEnum.MANAGE,
    ],
  },
  reviews: {
    description: 'Business review management',
    actions: [
      PermissionActionEnum.CREATE,
      PermissionActionEnum.READ,
      PermissionActionEnum.UPDATE,
      PermissionActionEnum.DELETE,
      PermissionActionEnum.VIEW_ALL,
      PermissionActionEnum.VIEW_OWN,
      PermissionActionEnum.APPROVE,
      PermissionActionEnum.REJECT,
      PermissionActionEnum.MANAGE,
    ],
  },

  // ── Business Directory — Business Sub-resources ──────────────────────
  business_socials: {
    description: 'Business social media link management',
    actions: [
      PermissionActionEnum.CREATE,
      PermissionActionEnum.READ,
      PermissionActionEnum.UPDATE,
      PermissionActionEnum.DELETE,
    ],
  },
  business_hours: {
    description: 'Business hours management',
    actions: [
      PermissionActionEnum.CREATE,
      PermissionActionEnum.READ,
      PermissionActionEnum.UPDATE,
      PermissionActionEnum.DELETE,
    ],
  },
  business_gallery: {
    description: 'Business gallery image management',
    actions: [
      PermissionActionEnum.CREATE,
      PermissionActionEnum.READ,
      PermissionActionEnum.UPDATE,
      PermissionActionEnum.DELETE,
    ],
  },
  business_services: {
    description: 'Business service listing management',
    actions: [
      PermissionActionEnum.CREATE,
      PermissionActionEnum.READ,
      PermissionActionEnum.UPDATE,
      PermissionActionEnum.DELETE,
    ],
  },
  business_products: {
    description: 'Business product listing management',
    actions: [
      PermissionActionEnum.CREATE,
      PermissionActionEnum.READ,
      PermissionActionEnum.UPDATE,
      PermissionActionEnum.DELETE,
    ],
  },
  business_branches: {
    description: 'Business branch/location management',
    actions: [
      PermissionActionEnum.CREATE,
      PermissionActionEnum.READ,
      PermissionActionEnum.UPDATE,
      PermissionActionEnum.DELETE,
    ],
  },

  // ── New Resources — Countries, Subscriptions, Payments, Media ─────────
  countries: {
    description: 'Country management',
    actions: [
      PermissionActionEnum.CREATE,
      PermissionActionEnum.READ,
      PermissionActionEnum.UPDATE,
      PermissionActionEnum.DELETE,
      PermissionActionEnum.MANAGE,
    ],
  },
  subscriptions: {
    description: 'Subscription management',
    actions: [
      PermissionActionEnum.CREATE,
      PermissionActionEnum.READ,
      PermissionActionEnum.UPDATE,
      PermissionActionEnum.DELETE,
      PermissionActionEnum.VIEW_ALL,
      PermissionActionEnum.VIEW_OWN,
      PermissionActionEnum.MANAGE,
    ],
  },
  subscription_plans: {
    description: 'Subscription plan management',
    actions: [
      PermissionActionEnum.CREATE,
      PermissionActionEnum.READ,
      PermissionActionEnum.UPDATE,
      PermissionActionEnum.DELETE,
      PermissionActionEnum.MANAGE,
    ],
  },
  payments: {
    description: 'Payment management',
    actions: [
      PermissionActionEnum.READ,
      PermissionActionEnum.VIEW_ALL,
      PermissionActionEnum.VIEW_OWN,
      PermissionActionEnum.EXPORT,
      PermissionActionEnum.MANAGE,
    ],
  },
  business_cards: {
    description: 'Business card management',
    actions: [
      PermissionActionEnum.CREATE,
      PermissionActionEnum.READ,
      PermissionActionEnum.UPDATE,
      PermissionActionEnum.DELETE,
    ],
  },
  business_media: {
    description: 'Business media management',
    actions: [
      PermissionActionEnum.CREATE,
      PermissionActionEnum.READ,
      PermissionActionEnum.UPDATE,
      PermissionActionEnum.DELETE,
    ],
  },
  notifications: {
    description: 'Notification management',
    actions: [
      PermissionActionEnum.CREATE,
      PermissionActionEnum.READ,
      PermissionActionEnum.MANAGE,
    ],
  },

  // ── System-level Resources ─────────────────────────────────────────────
  dashboard: {
    description: 'Dashboard & analytics access',
    actions: [
      PermissionActionEnum.READ,
      PermissionActionEnum.ANALYZE,
      PermissionActionEnum.REPORT,
      PermissionActionEnum.EXPORT,
    ],
  },
  settings: {
    description: 'System settings management',
    actions: [
      PermissionActionEnum.READ,
      PermissionActionEnum.UPDATE,
      PermissionActionEnum.CONFIGURE,
      PermissionActionEnum.BACKUP,
      PermissionActionEnum.RESTORE_BACKUP,
    ],
  },
};

/**
 * Seed 1: Creates all permissions and the super_admin role with full access.
 * This function expects the AppDataSource to be already initialized.
 */
export async function seedPermissionsAndSuperAdminRole(): Promise<void> {
  try {
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  SEED 1 — Permissions & Super Admin Role Setup');
    console.log('═══════════════════════════════════════════════════════════');

    const roleRepo = AppDataSource.getRepository(Role);
    const permissionRepo = AppDataSource.getRepository(Permission);
    const rolePermissionRepo = AppDataSource.getRepository(RolePermission);

    // ── Step 1: Create or update all permissions ─────────────────────────
    console.log('\n📜 Creating/updating permissions for all resources...');

    let createdCount = 0;
    let existingCount = 0;
    const allPermissions: Permission[] = [];

    for (const [resourceName, config] of Object.entries(RESOURCE_PERMISSIONS)) {
      for (const action of config.actions) {
        const permName = `${resourceName}.${action}`;
        const permDescription = `${config.description} - ${action}`;

        // Upsert: find existing or create new
        let permission = await permissionRepo.findOne({
          where: { name: permName },
        });

        if (!permission) {
          permission = permissionRepo.create({
            name: permName,
            description: permDescription,
            resource: resourceName,
            action: action,
          });
          await permissionRepo.save(permission);
          createdCount++;
        } else {
          // Update description/resource/action if they changed
          permission.description = permDescription;
          permission.resource = resourceName;
          permission.action = action;
          await permissionRepo.save(permission);
          existingCount++;
        }

        allPermissions.push(permission);
      }
    }

    console.log(
      `   ✅ Permissions: ${createdCount} created, ${existingCount} updated`,
    );
    console.log(`   📊 Total permissions: ${allPermissions.length}`);

    // ── Step 2: Create super_admin role if it doesn't exist ──────────────
    console.log('\n👑 Setting up super_admin role...');

    let superAdminRole = await roleRepo.findOne({
      where: { name: RoleEnum.SUPER_ADMIN },
    });

    if (!superAdminRole) {
      superAdminRole = roleRepo.create({
        name: RoleEnum.SUPER_ADMIN,
        description:
          'Super Administrator with unrestricted access to all resources and actions',
      });
      await roleRepo.save(superAdminRole);
      console.log('   ✅ super_admin role created.');
    } else {
      console.log('   ℹ️  super_admin role already exists.');
    }

    // ── Step 3: Assign ALL permissions to super_admin ────────────────────
    console.log('\n🔗 Assigning all permissions to super_admin...');

    let assignedCount = 0;
    let skippedCount = 0;

    for (const permission of allPermissions) {
      // Check if this role-permission link already exists
      const existing = await rolePermissionRepo.findOne({
        where: {
          roleId: superAdminRole.id,
          permissionId: permission.id,
        },
      });

      if (!existing) {
        const rolePermission = rolePermissionRepo.create({
          roleId: superAdminRole.id,
          permissionId: permission.id,
        });
        await rolePermissionRepo.save(rolePermission);
        assignedCount++;
      } else {
        skippedCount++;
      }
    }

    console.log(
      `   ✅ Role-permissions: ${assignedCount} assigned, ${skippedCount} already existed`,
    );

    console.log('\n🎉 Seed 1 completed successfully!\n');
  } catch (error) {
    console.error('❌ Seed 1 failed:', error.message);
    throw error;
  }
}

// ── Standalone execution ─────────────────────────────────────────────────────
// Allows running this seed independently: ts-node seeds/seed-permissions-superadmin-role.ts
if (require.main === module) {
  AppDataSource.initialize()
    .then(async () => {
      await seedPermissionsAndSuperAdminRole();
      await AppDataSource.destroy();
      console.log('🆑 Database connection closed.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Failed to initialize database:', error);
      process.exit(1);
    });
}
