# Digital Directory — Remaining Backend Implementation Plan

> Generated from SRS v2.0 gap analysis against current codebase  
> Date: March 2, 2026

---

## Current Status: ~92% Complete

The backend is well-architected using NestJS + TypeORM + PostgreSQL with 21 modules, 6 cron jobs, 9 email templates, Stripe integration, and Cloudflare R2 media storage. The following items represent the remaining work needed for full SRS compliance.

---

## Priority Levels

| Priority | Meaning |
|----------|---------|
| **P0 — Critical** | Data correctness, security, or business-logic bugs that break core flows |
| **P1 — High** | Missing SRS features required for launch |
| **P2 — Medium** | Incomplete implementations, missing admin capabilities |
| **P3 — Low** | Polish, cleanup, nice-to-haves for v1.0 |

---

## PHASE 1 — Bug Fixes & Security (P0)

### 1.1 Fix bcrypt Salt Rounds (SRS 7.2)

**Problem:** All password hashing uses 10 salt rounds; SRS mandates minimum 12.

**Files to change:**
- `src/modules/users/users.service.ts` — 2 occurrences of `bcrypt.hash(dto.password, 10)`
- `src/modules/auth/auth.service.ts` — 1 occurrence of `bcrypt.hash(dto.password, 10)`
- `seeds/seed-superadmin-user.ts` — 1 occurrence

**Action:** Replace all `bcrypt.hash(..., 10)` with `bcrypt.hash(..., 12)`. Extract to a constant `BCRYPT_SALT_ROUNDS = 12` in a shared config.

**Effort:** 30 min

---

### 1.2 Fix Listing Visibility Gate on Public Endpoints (SRS 6.2)

**Problem:** Public-facing enterprise endpoints return unapproved/unsubscribed listings.

The search module correctly enforces `is_approved = true` + active subscription check, but these do NOT:
- `GET /enterprises` — `EnterprisesService.findAll()` has no approval/subscription filter for public access
- `GET /enterprises/:id` — `EnterprisesService.findOne()` returns any enterprise
- `GET /enterprises/slug/:slug` — `EnterprisesService.findBySlug()` returns any enterprise

**Action:** Add a `publicView` query parameter or detect unauthenticated requests. When serving public users, enforce:
```sql
WHERE is_approved = true 
  AND is_active = true 
  AND EXISTS (SELECT 1 FROM subscriptions WHERE business_id = e.id AND status = 'active')
```
Authenticated owners should still see their own unapproved listings.

**Effort:** 2-3 hours

---

### 1.3 Fix Listing Rejected Email — Variable Mismatch (Bug)

**Problem:** `AdminService.rejectBusiness()` passes `{ rejectionReason: reason }` but the Handlebars template `listing-rejected.hbs` looks for `{{reason}}`. The rejection reason never renders.

**Action:** Change the context key from `rejectionReason` to `reason` in `AdminService.rejectBusiness()`, or update the template to use `{{rejectionReason}}`.

**Effort:** 15 min

---

### 1.4 Fix Subscription Confirmation Email — Variable Mismatch

**Problem:** `subscription-confirmation.hbs` expects `{{name}}`, `{{billingCycle}}`, `{{nextBillingDate}}`, `{{dashboardUrl}}` but the service passes different variable names (`planName`, `businessName`, `periodEnd`).

**Action:** Align the service's email context variables with what the template expects, or update the template variables.

**Effort:** 30 min

---

### 1.5 Fix Subscription Expiry Reminder Email — Variable Mismatch

**Problem:** The expiry reminder code passes `recipientName` instead of `name`, and omits `planName`/`dashboardUrl` that the template expects.

**Action:** Align the context variables in `SubscriptionsService` expiry methods with the `subscription-expiry-reminder.hbs` template expectations.

**Effort:** 30 min

---

## PHASE 2 — Missing Core Features (P1)

### 2.1 Invoice/Payment Receipt Email on Successful Payment

**SRS Requirement (3.4):** *"A payment receipt and invoice are automatically generated and emailed to the business owner after every successful transaction."*

**Current state:** No invoice email template exists. `handleInvoicePaid()` (renewal webhook) creates a payment record but sends no email. Initial checkout sends a generic `subscription-confirmation` email with no payment details.

**Implementation:**
1. Create `src/modules/notifications/templates/payment-receipt.hbs` template with:
   - Business owner's name
   - Business name
   - Amount charged + currency
   - Payment date
   - Plan name + billing period (start → end)
   - Stripe payment intent ID (as reference number)
   - Dashboard URL
2. Send this email from `handleCheckoutCompleted()` (initial payment)
3. Send this email from `handleInvoicePaid()` (renewal payment)
4. Include key payment data: amount, currency, invoice reference, next billing date

**Optional enhancement (P3):** Generate a PDF invoice using a library like `pdfkit` or `puppeteer`, attach it to the email, and store the PDF URL in the payments table.

**Effort:** 3-4 hours

---

### 2.2 Create Listing Approved Email Template

**SRS Requirement (3.5):** Distinct "Listing Approved" notification.

**Current state:** `AdminService.approveBusiness()` sends an email but uses the generic `broadcast` template instead of a dedicated one.

**Implementation:**
1. Create `src/modules/notifications/templates/listing-approved.hbs` with:
   - Congratulatory message
   - Business name
   - Link to the live listing (subdomain URL)
2. Update `AdminService.approveBusiness()` to use the new template with proper context variables

**Effort:** 1 hour

---

### 2.3 Admin: Reset User Password Endpoint

**SRS Requirement (3.1, 6.3):** *"reset passwords on behalf of users"*

**Current state:** Only self-service password reset exists via `auth/password-forgot`.

**Implementation:**
1. Add `PATCH /admin/users/:id/reset-password` endpoint to `AdminController`
2. Create `AdminResetPasswordDto` with optional `newPassword` field
3. If `newPassword` is provided, hash it and set directly; otherwise generate a temp password
4. Send a "password reset by admin" email to the user with temp password or reset link
5. Optionally add an `AdminResetPasswordEmailTemplate` or reuse `password-reset.hbs`
6. Log the action in audit logs

**Effort:** 2-3 hours

---

### 2.4 Admin: Payment Listing by Country

**SRS Requirement (3.1):** *"View all payment transactions, subscription statuses, and revenue metrics by country."*

**Current state:** `PaymentsService.findAll()` exists but is not exposed through the admin controller and has no `countryId` filter.

**Implementation:**
1. Add `GET /admin/payments` endpoint to `AdminController` with filters: `countryId`, `status`, `dateFrom`, `dateTo`, `page`, `limit`
2. Update `PaymentsService.findAll()` (or create `findAllAdmin()`) to JOIN through `subscriptions → enterprises → countries` to support country filtering
3. Add `GET /admin/subscriptions` endpoint with similar country filtering

**Effort:** 3-4 hours

---

### 2.5 Admin: Send Email to Individual Users

**SRS Requirement (6.3):** *"send email notifications to all users, users within a specific country, or individual accounts"*

**Current state:** Broadcast supports all users or by countryId, but not individual targeting.

**Implementation:**
1. Update `BroadcastNotificationDto` to accept an optional `userId` or `email` field
2. Update `NotificationsService.sendBroadcast()` to handle single-user targeting
3. When `userId` is provided, send only to that user

**Effort:** 1-2 hours

---

### 2.6 Admin: Analytics by Country

**SRS Requirement (3.1):** *"active businesses per country, subscription conversion rates, and payment volumes"*

**Current state:** Analytics return aggregate totals with no country breakdown.

**Implementation:**
1. Update `GET /admin/analytics` to accept optional `countryId` filter
2. Add a new response section: `businessesByCountry[]` with `{ countryId, countryName, total, approved, active }`
3. Add `subscriptionConversionRate` = `(businesses with active subs / total approved businesses) * 100`
4. Update `GET /admin/analytics/revenue` to accept `countryId` filter and return per-country breakdown
5. Add `paymentVolumeByCountry[]` with `{ countryId, countryName, totalAmount, count }`

**Effort:** 4-5 hours

---

## PHASE 3 — Hardening & Completeness (P2)

### 3.1 Per-Route Rate Limiting on Auth & Search (SRS 7.2)

**Current state:** Only global rate limiting exists (300 req/min express-rate-limit + 100 req/min ThrottlerModule). Auth endpoints have no tighter limits.

**Implementation:**
1. Add `@Throttle({ default: { limit: 5, ttl: 60000 } })` on auth endpoints:
   - `POST /auth/login`
   - `POST /auth/register`
   - `POST /auth/password-forgot`
   - `POST /auth/reset-password`
2. Add `@Throttle({ default: { limit: 30, ttl: 60000 } })` on search endpoints:
   - `GET /search`
   - `GET /search/suggestions`
3. Ensure `ThrottlerGuard` is properly applied globally (already done via `APP_GUARD`)

**Effort:** 1 hour

---

### 3.2 Add `auto_renew` Column to Subscriptions (SRS 8.11)

**Current state:** Stripe handles recurring billing natively since checkout uses `mode: 'subscription'`, but the subscriptions entity has no `auto_renew` boolean as defined in the SRS schema.

**Implementation:**
1. Create migration: `AddAutoRenewToSubscriptions` with `auto_renew BOOLEAN DEFAULT false`
2. Add `autoRenew` column to the `Subscription` entity
3. Add `POST /subscriptions/auto-renew` endpoint to toggle auto-renewal
4. On toggle, call Stripe API to update the subscription's `cancel_at_period_end` flag:
   - `auto_renew = true` → `cancel_at_period_end = false`
   - `auto_renew = false` → `cancel_at_period_end = true`
5. Update webhook handler to sync `auto_renew` from Stripe subscription metadata

**Effort:** 3-4 hours

---

### 3.3 Typed DTOs for Admin Plan CRUD

**Current state:** `AdminController.createPlan()` and `updatePlan()` use `@Body() dto: any` — no validation.

**Implementation:**
1. Create `src/modules/admin/dto/create-plan.dto.ts`:
   ```typescript
   class CreatePlanDto {
     @IsString() name: string;
     @IsNumber() price: number;
     @IsNumber() durationInDays: number;
     @IsOptional() @IsString() stripePriceIdMonthly?: string;
     @IsOptional() @IsString() stripePriceIdYearly?: string;
     @IsOptional() @IsNumber() maxBusinesses?: number;
   }
   ```
2. Create `src/modules/admin/dto/update-plan.dto.ts` using `PartialType(CreatePlanDto)`
3. Apply DTOs to admin controller endpoints

**Effort:** 1 hour

---

### 3.4 Wire Audit Logging Broadly

**Current state:** `AuditLogsService` exists but is only injected in the admin controller. No automatic logging for entity changes across the app.

**Implementation:**
1. Create `src/common/interceptor/audit-log.interceptor.ts`:
   - Intercepts POST, PATCH, PUT, DELETE requests
   - Captures: `userId`, `action` (HTTP method), `resource` (route path), `resourceId` (ID param), `oldValue`/`newValue` (response body)
   - Logs via `AuditLogsService.log()`
2. Apply the interceptor globally or selectively on admin/enterprise/subscription controllers
3. Alternatively: add explicit `auditLogsService.log()` calls to key service methods:
   - Business creation/update/deletion
   - Subscription creation/cancellation
   - User suspension/reinstatement
   - Plan creation/update

**Effort:** 4-5 hours

---

### 3.5 Clean Up Dead Code in Users Module

**Current state:** ~200 lines of commented-out code (`createWithPermissions`, `assignPermissions`) in `users.service.ts`. Unused DTO imports in controller.

**Action:** Either remove the dead code or uncomment and integrate if the feature is needed. Remove unused imports.

**Effort:** 30 min

---

## PHASE 4 — Testing (P1)

### 4.1 Integration Tests

**Current state:** Only 1 test file with 2 test cases (auth login). The test README describes a full structure that doesn't exist.

**Implementation — Priority test suites:**

| Test Suite | Coverage Target | Effort |
|---|---|---|
| **Auth (registration + verification + login + refresh + password reset)** | Full flow | 4-5 hours |
| **Enterprises CRUD (create + update + approve + visibility gate)** | Full flow | 4-5 hours |
| **Subscriptions (checkout + webhook + expiry + cancellation)** | Full flow | 5-6 hours |
| **Payments (webhook creates payment + user views payments)** | Read+webhook | 2-3 hours |
| **Admin (approve/reject listing, suspend user, analytics)** | Key actions | 3-4 hours |
| **Search (country scoping, filters, visibility gate)** | All filter combos | 3-4 hours |
| **Webhooks (Stripe signature verification, all event types)** | 4 event types | 2-3 hours |
| **Business Cards & Media (upload, replace, delete + R2 integration)** | Full CRUD | 2-3 hours |
| **Country Resolution Middleware** | Subdomain → country | 1-2 hours |

**Total effort:** ~30-35 hours

---

### 4.2 Unit Tests for Services

| Service | Methods to Test | Effort |
|---|---|---|
| `SubscriptionsService` | checkout, webhook handlers, expiry check, cancellation | 4 hours |
| `NotificationsService` | sendEmail, sendBroadcast, retryFailed | 2 hours |
| `SearchService` | search with all filter combos, suggestions | 2 hours |
| `AdminService` | analytics, approval/rejection, broadcast | 3 hours |
| `EnterprisesService` | CRUD, visibility gating, owner scoping | 3 hours |

**Total effort:** ~14 hours

---

## PHASE 5 — Nice-to-Haves for v1.0 (P3)

### 5.1 PDF Invoice Generation

Generate actual PDF invoices using `pdfkit` or `@react-pdf/renderer`, store them in R2, and link in the payment email.

**Effort:** 6-8 hours

---

### 5.2 Swagger/OpenAPI Documentation Completeness

Ensure all endpoints have `@ApiTags`, `@ApiOperation`, `@ApiResponse`, `@ApiBearerAuth` decorators. Add request/response schema examples.

**Effort:** 4-5 hours

---

### 5.3 Health Check Endpoint (SRS 7.4)

Add `GET /health` endpoint that checks:
- Database connectivity
- R2 storage connectivity
- Stripe API connectivity
- Email service connectivity

Use `@nestjs/terminus` for standard health checks.

**Effort:** 2 hours

---

### 5.4 Admin: Delete User Permanently (SRS 6.1)

**SRS says:** *"permanently delete any user account"*. Current admin controller has suspend/reinstate but no permanent delete with cascade cleanup.

**Effort:** 2-3 hours

---

### 5.5 Containerized Deployment Setup (SRS 7.3)

Create `Dockerfile`, `docker-compose.yml` (with PostgreSQL + app), and `.dockerignore`. Add CI/CD pipeline config.

**Effort:** 3-4 hours

---

## Effort Summary

| Phase | Description | Estimated Effort |
|---|---|---|
| **Phase 1** | Bug Fixes & Security | ~5 hours |
| **Phase 2** | Missing Core Features | ~15-19 hours |
| **Phase 3** | Hardening & Completeness | ~10-12 hours |
| **Phase 4** | Testing | ~45-50 hours |
| **Phase 5** | Nice-to-Haves | ~17-22 hours |
| **Total** | | **~92-108 hours** |

---

## Recommended Execution Order

```
Week 1 (Priority):
  ├─ Phase 1 — All bug fixes (1.1 → 1.5)
  ├─ Phase 2.1 — Payment receipt email
  ├─ Phase 2.2 — Listing approved email  
  └─ Phase 2.3 — Admin reset password

Week 2 (Core Features):
  ├─ Phase 2.4 — Admin payment listing by country
  ├─ Phase 2.5 — Admin individual email
  ├─ Phase 2.6 — Admin analytics by country
  ├─ Phase 3.1 — Per-route rate limiting
  └─ Phase 3.2 — Auto-renew column + endpoint

Week 3 (Hardening):
  ├─ Phase 3.3 — Admin plan DTOs
  ├─ Phase 3.4 — Audit logging interceptor
  ├─ Phase 3.5 — Dead code cleanup
  └─ Phase 4.1 — Auth + Enterprises integration tests

Week 4+ (Testing & Polish):
  ├─ Phase 4.1 — Remaining integration tests
  ├─ Phase 4.2 — Unit tests
  └─ Phase 5 — Nice-to-haves as time permits
```

---

## Files That Need Changes

| File | Changes |
|---|---|
| `src/modules/users/users.service.ts` | Fix bcrypt rounds, clean dead code |
| `src/modules/auth/auth.service.ts` | Fix bcrypt rounds |
| `seeds/seed-superadmin-user.ts` | Fix bcrypt rounds |
| `src/modules/enterprises/enterprises.service.ts` | Add visibility gate on public queries |
| `src/modules/admin/admin.service.ts` | Fix rejection email var, add analytics by country, add payment listing, add password reset |
| `src/modules/admin/admin.controller.ts` | Add new endpoints (payments, reset password) |
| `src/modules/subscriptions/subscriptions.service.ts` | Fix email variables, add auto-renew toggle, send receipt on renewal |
| `src/modules/subscriptions/entities/subscription.entity.ts` | Add autoRenew column |
| `src/modules/payments/payments.service.ts` | Add country filter for admin |
| `src/modules/notifications/templates/` | Add listing-approved.hbs, payment-receipt.hbs |
| `src/modules/notifications/notifications.service.ts` | Support individual user targeting |
| `src/modules/auth/auth.controller.ts` | Add @Throttle decorators |
| `src/modules/search/search.controller.ts` | Add @Throttle decorators |
| `src/common/interceptor/audit-log.interceptor.ts` | New file |
| `src/modules/admin/dto/` | New DTOs for plan CRUD |
| `migrations/` | New migration for auto_renew column |
| `test/` | All new test files |
