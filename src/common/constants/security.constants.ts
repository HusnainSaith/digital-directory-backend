/**
 * Shared security constants for the application.
 * Centralizes values that must stay consistent across modules.
 */

/** Bcrypt salt rounds for password hashing — SRS §7.2 mandates ≥ 12 */
export const BCRYPT_SALT_ROUNDS = 12;
