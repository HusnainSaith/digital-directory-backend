import 'reflect-metadata';
import { AppDataSource } from '../src/config/data-source';
import { Role } from '../src/modules/roles/entities/role.entity';
import { User } from '../src/modules/users/entities/user.entity';
import { RoleEnum } from '../src/modules/roles/role.enum';
import * as bcrypt from 'bcryptjs';
import { BCRYPT_SALT_ROUNDS } from '../src/common/constants/security.constants';

// ============================================================================
// SEED FILE 3 — Super Admin User Creation
// ============================================================================
// Creates a default super admin user with the super_admin role.
// Uses bcryptjs with 10 salt rounds (same as the rest of the project).
// Check-before-insert logic ensures re-running won't create duplicates.
// ============================================================================

// ── Super admin credentials ──────────────────────────────────────────────────
const SUPER_ADMIN_EMAIL = 'ramzanhusnain7194@gmail.com';
const SUPER_ADMIN_PASSWORD = 'SuperAdmin@2026';
const SUPER_ADMIN_NAME = 'Super Administrator';

/**
 * Seed 3: Creates the super admin user and assigns the super_admin role.
 * Expects AppDataSource to be already initialized and Seeds 1 & 2 to have run.
 */
export async function seedSuperAdminUser(): Promise<void> {
  try {
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  SEED 3 — Super Admin User Creation');
    console.log('═══════════════════════════════════════════════════════════');

    const roleRepo = AppDataSource.getRepository(Role);
    const userRepo = AppDataSource.getRepository(User);

    // ── Step 1: Find the super_admin role ────────────────────────────────
    console.log('\n🔍 Looking up super_admin role...');

    const superAdminRole = await roleRepo.findOne({
      where: { name: RoleEnum.SUPER_ADMIN },
    });

    if (!superAdminRole) {
      throw new Error(
        'super_admin role not found. Please run Seed 1 first ' +
          '(seed-permissions-superadmin-role.ts)',
      );
    }

    console.log(`   ✅ Found super_admin role (ID: ${superAdminRole.id})`);

    // ── Step 2: Check if super admin user already exists ─────────────────
    console.log('\n👤 Checking for existing super admin user...');

    let superAdminUser = await userRepo.findOne({
      where: { email: SUPER_ADMIN_EMAIL },
    });

    if (superAdminUser) {
      // User exists — update role to super_admin if it changed and ensure verified
      let updated = false;
      if (superAdminUser.roleId !== superAdminRole.id) {
        superAdminUser.roleId = superAdminRole.id;
        updated = true;
      }
      if (!superAdminUser.isVerified) {
        superAdminUser.isVerified = true;
        superAdminUser.emailVerifiedAt = new Date();
        updated = true;
      }
      if (updated) {
        await userRepo.save(superAdminUser);
        console.log(
          `   🔄 User "${SUPER_ADMIN_EMAIL}" updated — role: super_admin, verified: true.`,
        );
      } else {
        console.log(
          `   ℹ️  User "${SUPER_ADMIN_EMAIL}" already exists with super_admin role and is verified.`,
        );
      }
    } else {
      // ── Step 3: Hash password and create the user ────────────────────
      console.log('\n🔐 Hashing password with bcryptjs (10 salt rounds)...');
      const hashedPassword = await bcrypt.hash(SUPER_ADMIN_PASSWORD, BCRYPT_SALT_ROUNDS);

      superAdminUser = userRepo.create({
        email: SUPER_ADMIN_EMAIL,
        passwordHash: hashedPassword,
        name: SUPER_ADMIN_NAME,
        roleId: superAdminRole.id,
        isVerified: true,
        emailVerifiedAt: new Date(),
      });

      await userRepo.save(superAdminUser);

      console.log('\n   ┌─────────────────────────────────────────────────┐');
      console.log('   │  🎉 Super Admin User Created Successfully!      │');
      console.log('   ├─────────────────────────────────────────────────┤');
      console.log(`   │  Email:    ${SUPER_ADMIN_EMAIL}`);
      console.log(`   │  Password: ${SUPER_ADMIN_PASSWORD}`);
      console.log(`   │  Name:     ${SUPER_ADMIN_NAME}`);
      console.log(`   │  Role:     ${RoleEnum.SUPER_ADMIN}`);
      console.log('   └─────────────────────────────────────────────────┘');
      console.log(
        '\n   ⚠️  IMPORTANT: Change the default password after first login!',
      );
    }

    console.log('\n🎉 Seed 3 completed successfully!\n');
  } catch (error) {
    console.error('❌ Seed 3 failed:', error.message);
    throw error;
  }
}

// ── Standalone execution ─────────────────────────────────────────────────────
// Allows running this seed independently: ts-node seeds/seed-superadmin-user.ts
if (require.main === module) {
  AppDataSource.initialize()
    .then(async () => {
      await seedSuperAdminUser();
      await AppDataSource.destroy();
      console.log('🆑 Database connection closed.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Failed to initialize database:', error);
      process.exit(1);
    });
}
