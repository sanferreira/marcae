# Marcaê

A SaaS mobile app for **any appointment-based independent professional** — barbershops, salons, lashes, brows, nails, aesthetics, tattoo, massage, etc. Clients book appointments, admins manage staff, services, finances, and loyalty programs. Monetization: paid plans from R$59,90/mo via Stripe; new establishments start as `pending` and unlock only after Stripe confirms payment.

The mobile app, landing, and Stripe product all use the **Marcaê** brand. The product copy uses "estabelecimento" (establishment) instead of "barbearia" so it speaks to every niche. The internal DB schema (`barbershops` table, `barbershopId` columns, etc.) keeps the legacy name to avoid a rename migration — only user-facing copy changed.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port auto-assigned)
- `pnpm --filter @workspace/mobile run dev` — run the Expo mobile app
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- Required env: `DATABASE_URL` — Postgres connection string (not yet used; app uses AsyncStorage)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Mobile: Expo (SDK 54), Expo Router v6, React Native 0.81
- State: React Context for auth + React Query for business data, all backed by API
- API: Express 5 with bcryptjs + DB-backed sessions (Bearer token + httpOnly cookie); role-based authorization (admin/employee/client)
- DB: PostgreSQL + Drizzle ORM — all entities live in Postgres (services, products, professionals, clients, appointments, cash, loyalty); Stripe sync schema (`stripe.*`) managed by `stripe-replit-sync`
- Billing: Stripe plans Base (R$59,90/mo), Medio (R$89,90/mo), and Super (R$129,90/mo) via `stripe@20.0.0` SDK + `stripe-replit-sync@1.0.0` for managed webhooks + sync schema
- Build: esbuild (CJS bundle for API server)

## Where things live

- `artifacts/mobile/` — Expo mobile app
  - `app/(auth)/` — Login and Register screens
  - `app/(client)/` — Client-facing tabs: Home, Appointments, Loyalty, Profile
  - `app/(admin)/` — Admin tabs: Dashboard, Agenda, Clients, Financial, Services
  - `contexts/AuthContext.tsx` — Auth state + role-based routing
  - `contexts/DataContext.tsx` — All barbershop data (services, professionals, appointments, clients, cash)
  - `components/` — Shared UI components (cards, stat boxes, progress bar)
  - `constants/colors.ts` — Dark gold barbershop theme (light + dark)
- `artifacts/api-server/` — Express API server
- `lib/api-spec/openapi.yaml` — OpenAPI contract source of truth

## Architecture decisions

- Auth: real multi-tenant via Postgres. `register-shop` creates shop + admin in `pending`; the app immediately opens Stripe Checkout for the selected plan. `register-client` creates client+user inside an existing shop slug; sessions stored in DB, token returned to client and used as `Authorization: Bearer`.
- Business data: full CRUD via API (`/api/services|products|professionals|clients|appointments|cash-entries|loyalty/*`). Tenant isolation enforced server-side on every query (filtered by `req.auth.barbershop.id`); cross-tenant FK refs blocked on appointment creation.
- Authorization matrix: only admin can mutate services/products/professionals/loyalty-settings/cash; client can only read/modify own client row, own appointments (cancel only), own loyalty; employee can read most things and edit own schedule.
- Race-safety: completing an appointment uses a conditional UPDATE (status WHERE prev-status) so concurrent PATCHes can't double-increment loyalty.
- Push notifications: `users.expo_push_token` stores the Expo token per user; mobile registers it on login/hydrate via `POST /api/auth/push-token` and clears it on logout. When an appointment is created, the server fires-and-forgets a push to the employee linked to the assigned professional + every admin of the shop (Expo HTTP `/--/api/v2/push/send`, no SDK).
- Billing (Stripe): products/prices are auto-created per plan on first checkout: Base (R$59,90), Medio (R$89,90), and Super (R$129,90). `barbershops.stripe_customer_id` + `stripe_subscription_id` track the link. `POST /api/billing/checkout` accepts `{ plan: "base" | "medio" | "super" }` and returns a Stripe Checkout URL; `POST /api/billing/portal` opens the customer portal; `POST /api/billing/sync` re-pulls subscription state from Stripe (used after the mobile WebBrowser closes). The managed webhook is auto-created on startup via `stripe-replit-sync.findOrCreateManagedWebhook` and posts to `/api/stripe/webhook` (registered BEFORE `express.json` so the raw body survives signature verification). On `checkout.session.completed`, `customer.subscription.*`, and `invoice.paid`, the server sets `barbershops.plan` to the active paid plan and stamps `subscription_renews_at`; `invoice.payment_failed` marks the plan as `pending`; canceled/expired subscriptions become `expired`; legacy `premium` subscriptions remain active. `requirePremiumForMutations` middleware sits between `/auth` + `/billing` and every CRUD router, returning 402 `{ code: "subscription_required" }` for any POST/PATCH/DELETE when `planStatus.isActive === false`. Reads stay open so users can still review history.
- Total-block UX: `app/index.tsx` redirects admins with an inactive plan to `app/upgrade.tsx`. Other roles can still browse (read-only) — backend enforces the write block. Two helpers mounted at the root layout cover the rest:
  - `<TrialBanner />` shows a slim gold bar with `X dias restantes` while the shop is on trial; tappable for admins to jump straight to `/upgrade`.
  - `<SubscriptionGate />` listens for 402 responses globally (via `onSubscriptionRequired` in `lib/api.ts`) and either redirects admins to `/upgrade` or shows a friendly "assinatura vencida" alert to client/employee. Rate-limited to one alert per 5s so a burst of failed mutations doesn't stack popups.
- Two distinct role flows: `client` → `(client)` tabs, `admin` → `(admin)` tabs, routing done in `app/index.tsx`
- Demo accounts seeded in AuthContext for easy testing without registration
- Appointment booking is a 4-step modal flow (services → professional → date/time → confirm)
- Loyalty points auto-awarded when admin marks appointment as completed

## Product

- **Client side**: Browse services, book with any professional (date/time picker, conflict detection), view upcoming/past appointments, track loyalty progress, manage profile
- **Admin side**: Dashboard with KPI stats (revenue, appointments, top services), daily agenda with complete/cancel actions, client CRM with loyalty tracking, financial overview (income/expense/profit by period and payment method), service catalog management (add/edit/toggle active), brand customization (estabelecimento name + 2 color pickers)

## Brand customization

- DB: `barbershops.brand_primary` + `brand_accent` (text, NOT NULL, default `#C9A96E` / `#0C0C0C`).
- API: `PATCH /api/barbershop` (admin-only, hex regex validated) returns the updated `Barbershop`. `serializeBarbershop` and the public `/barbershops/:slug/exists` lookup both expose `brandPrimary`/`brandAccent`.
- Mobile theming: `contexts/BrandColorsContext.tsx` reads `barbershop.brandPrimary`/`brandAccent` from `useAuth` and exposes a `BrandColors` value. `hooks/useColors.ts` overlays it onto the `gold` / `primary` / `accent` / `tint` slots so every screen recolors without prop-drilling. `BrandColorsProvider` MUST sit between `AuthProvider` and `DataProvider` in `app/_layout.tsx`. Auth screens render with the default Marcaê palette because no auth → no overlay.
- Settings UI: `app/admin-settings.tsx` (root-level Stack screen, not a tab) — name field + 2 swatch grids + hex input + live preview card. Reachable from the admin dashboard avatar menu.

## User preferences

- Portuguese language (pt-BR) throughout the UI
- Dark gold barbershop aesthetic — primary color `#C9A96E` (gold), dark background `#0C0C0C`
- No emojis in UI (except user-facing greeting on home screen)

## Gotchas

- Always run `pnpm --filter @workspace/api-spec run codegen` after OpenAPI spec changes before using generated hooks
- The `(tabs)` scaffold directory was removed and replaced with `(client)` and `(admin)` route groups
- Demo login (slug `primeiro_nucleo`): admin@barberpro.com / admin123, client joao@email.com / 123456, employee rafael@barberpro.com / func123. Re-seed demo data (idempotent, dev only) with `curl -X POST http://localhost/api/_dev/seed-demo`. (Demo emails kept on the `barberpro.com` domain on purpose — they are seeded constants used in onboarding.)
- Brand color zod export from codegen is `UpdateBarbershopSettingsBody` (taken from the OpenAPI `operationId`, not the schema name). The TS type is still `UpdateBarbershopInput`.
- Force trial-expired state for testing: `UPDATE barbershops SET trial_ends_at=NOW()-interval '1 day' WHERE slug='primeiro_nucleo'`.
- Existing rows already get the brand defaults via the column DEFAULT, so the rebrand migration was non-breaking. If you ever ALTER away the default, backfill first.
- `barbershopUsers` lookup is still stubbed in AuthContext (employee management UI uses backend endpoints directly).
- `stripe-replit-sync` ships SQL migration files under its `dist/migrations/` folder, so it MUST be marked as `external` in `artifacts/api-server/build.mjs`. `pg` is also external because of that. If you re-bundle either, `findOrCreateManagedWebhook` will fail at runtime with `relation "stripe.accounts" does not exist`.
- The Stripe API version pin (`2025-11-17.clover`) is dictated by the SDK type definitions — bumping `stripe` requires updating it.
- Webhook signature verification falls back to trusting `stripe-replit-sync.processWebhook` only when the managed webhook init didn't run (e.g. missing `REPLIT_DOMAINS`). In production both paths verify.
- Push tokens only register on physical devices (Expo simulators and web return null silently). Notifications module is dynamically imported so the web bundle doesn't break.
- New shops registered via `/auth/register-shop` start with empty catalogs (no services/professionals); admin must add them through the UI.
- Expo web preview may appear blank on first load — the native preview via Expo Go QR code is the source of truth

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
