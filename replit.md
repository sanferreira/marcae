# BarberPro

A SaaS mobile app for barbershop management — clients book appointments, admins manage staff, services, finances, and loyalty programs. Monetization: R$59/mo via Stripe, with a 7-day free trial that converts to a hard block on the admin until the subscription is active.

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
- Billing: Stripe (R$59/mo) via `stripe@20.0.0` SDK + `stripe-replit-sync@1.0.0` for managed webhooks + sync schema
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

- Auth: real multi-tenant via Postgres. `register-shop` creates shop + admin + 7-day trial; `register-client` creates client+user inside an existing shop slug; sessions stored in DB, token returned to client and used as `Authorization: Bearer`.
- Business data: full CRUD via API (`/api/services|products|professionals|clients|appointments|cash-entries|loyalty/*`). Tenant isolation enforced server-side on every query (filtered by `req.auth.barbershop.id`); cross-tenant FK refs blocked on appointment creation.
- Authorization matrix: only admin can mutate services/products/professionals/loyalty-settings/cash; client can only read/modify own client row, own appointments (cancel only), own loyalty; employee can read most things and edit own schedule.
- Race-safety: completing an appointment uses a conditional UPDATE (status WHERE prev-status) so concurrent PATCHes can't double-increment loyalty.
- Push notifications: `users.expo_push_token` stores the Expo token per user; mobile registers it on login/hydrate via `POST /api/auth/push-token` and clears it on logout. When an appointment is created, the server fires-and-forgets a push to the employee linked to the assigned professional + every admin of the shop (Expo HTTP `/--/api/v2/push/send`, no SDK).
- Billing (Stripe): single product "BarberPro Premium" at R$59 BRL/month, auto-created on first checkout. `barbershops.stripe_customer_id` + `stripe_subscription_id` track the link. `POST /api/billing/checkout` returns a Stripe Checkout URL; `POST /api/billing/portal` opens the customer portal; `POST /api/billing/sync` re-pulls subscription state from Stripe (used after the mobile WebBrowser closes). The managed webhook is auto-created on startup via `stripe-replit-sync.findOrCreateManagedWebhook` and posts to `/api/stripe/webhook` (registered BEFORE `express.json` so the raw body survives signature verification). On `customer.subscription.*` events the server sets `barbershops.plan` to `premium` / `expired` and stamps `subscription_renews_at`. `requirePremiumForMutations` middleware sits between `/auth` + `/billing` and every CRUD router, returning 402 `{ code: "subscription_required" }` for any POST/PATCH/DELETE when `planStatus.isActive === false`. Reads stay open so users can still review history.
- Total-block UX: `app/index.tsx` redirects admins with an inactive plan to `app/upgrade.tsx`. Other roles can still browse (read-only) — backend enforces the write block. Two helpers mounted at the root layout cover the rest:
  - `<TrialBanner />` shows a slim gold bar with `X dias restantes` while the shop is on trial; tappable for admins to jump straight to `/upgrade`.
  - `<SubscriptionGate />` listens for 402 responses globally (via `onSubscriptionRequired` in `lib/api.ts`) and either redirects admins to `/upgrade` or shows a friendly "assinatura vencida" alert to client/employee. Rate-limited to one alert per 5s so a burst of failed mutations doesn't stack popups.
- Two distinct role flows: `client` → `(client)` tabs, `admin` → `(admin)` tabs, routing done in `app/index.tsx`
- Demo accounts seeded in AuthContext for easy testing without registration
- Appointment booking is a 4-step modal flow (services → professional → date/time → confirm)
- Loyalty points auto-awarded when admin marks appointment as completed

## Product

- **Client side**: Browse services, book with any professional (date/time picker, conflict detection), view upcoming/past appointments, track loyalty progress, manage profile
- **Admin side**: Dashboard with KPI stats (revenue, appointments, top services), daily agenda with complete/cancel actions, client CRM with loyalty tracking, financial overview (income/expense/profit by period and payment method), service catalog management (add/edit/toggle active)

## User preferences

- Portuguese language (pt-BR) throughout the UI
- Dark gold barbershop aesthetic — primary color `#C9A96E` (gold), dark background `#0C0C0C`
- No emojis in UI (except user-facing greeting on home screen)

## Gotchas

- Always run `pnpm --filter @workspace/api-spec run codegen` after OpenAPI spec changes before using generated hooks
- The `(tabs)` scaffold directory was removed and replaced with `(client)` and `(admin)` route groups
- Demo login (slug `primeiro_nucleo`): admin@barberpro.com / admin123, client joao@email.com / 123456, employee rafael@barberpro.com / func123. Re-seed demo data (idempotent, dev only) with `curl -X POST http://localhost/api/_dev/seed-demo`.
- `barbershopUsers` lookup is still stubbed in AuthContext (employee management UI uses backend endpoints directly).
- `stripe-replit-sync` ships SQL migration files under its `dist/migrations/` folder, so it MUST be marked as `external` in `artifacts/api-server/build.mjs`. `pg` is also external because of that. If you re-bundle either, `findOrCreateManagedWebhook` will fail at runtime with `relation "stripe.accounts" does not exist`.
- The Stripe API version pin (`2025-11-17.clover`) is dictated by the SDK type definitions — bumping `stripe` requires updating it.
- Webhook signature verification falls back to trusting `stripe-replit-sync.processWebhook` only when the managed webhook init didn't run (e.g. missing `REPLIT_DOMAINS`). In production both paths verify.
- Push tokens only register on physical devices (Expo simulators and web return null silently). Notifications module is dynamically imported so the web bundle doesn't break.
- New shops registered via `/auth/register-shop` start with empty catalogs (no services/professionals); admin must add them through the UI.
- Expo web preview may appear blank on first load — the native preview via Expo Go QR code is the source of truth

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
