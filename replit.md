# BarberPro

A SaaS mobile app for barbershop management — clients book appointments, admins manage staff, services, finances, and loyalty programs.

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
- State: AsyncStorage for persistence, React Context for shared state
- API: Express 5 (backend stub; currently unused by mobile)
- DB: PostgreSQL + Drizzle ORM (not yet wired to mobile)
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

- AsyncStorage used for all data persistence in mobile first build (no backend required)
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
- Demo login: admin@barberpro.com / admin123, client: joao@email.com / 123456
- Expo web preview may appear blank on first load — the native preview via Expo Go QR code is the source of truth

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
