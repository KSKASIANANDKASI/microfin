# Developer manual

Microfin LMS is a loan management system for small doorstep-collection lenders: staff onboard
customers, capture KYC and a doorstep pin, submit loan applications, managers approve and
disburse, and loan officers collect monthly installments along a line.

Companion documents:

- [API manual](API_MANUAL.md) — every endpoint, with request and response shapes
- [Database schema](DATABASE_SCHEMA.md) — tables, constraints, lifecycles
- [Postman collection](postman/) — runnable requests for the whole API

## 1. Where things stand

Read this first; it explains most of what will otherwise look odd in the repository.

| Piece | State |
|---|---|
| `apps/api-spring` | **The backend.** Complete for the screens that exist: auth, staff, lines, customers, KYC, applications, loans, collection, reports, AI assistant. Tested. |
| `apps/web`, `apps/mobile` | Full UI in English and Tamil, but running on **in-memory sample data** (`src/lib/data.ts`). The only network call either app makes is the web app's AI chat. Nothing persists across a reload. |
| `apps/api` | A Node stub that serves only `/health` and `/ai/chat`. Superseded by `apps/api-spring`; both default to port 4000, so run one. |
| `packages/db` | A Prisma schema from an earlier design. Not used by anything running. See the [schema doc](DATABASE_SCHEMA.md#the-prisma-schema-packagesdb). |
| `packages/shared` | A loan engine (reducing-balance interest, penalties, allocation) from the same earlier design. Not imported by the apps or the Spring API. |

So the next piece of real work is **wiring the apps to the Spring API** ([section 8](#8-wiring-an-app-screen-to-the-api)).
The API's response shapes were deliberately modelled on the types in `lib/data.ts` so screens can
be switched one at a time.

Known breakage as of this writing:

- `npm run typecheck` fails in `@lms/shared` (`src/index.ts` exports `./validation`, which does
  not exist) and in `@lms/db` until `npm run db:generate` has been run. `@lms/api`, `@lms/web`,
  `@lms/theme` and `@lms/i18n` pass.
- `npm run db:seed` points at `packages/db/src/seed.ts`, which does not exist.
- `apps/api-spring` is not yet committed to git.

## 2. Repository layout

```
microfin-lms/
├── apps/
│   ├── api-spring/        Spring Boot API (Java 17, Maven) — not an npm workspace
│   ├── api/               Node stub API (TypeScript, tsx)
│   ├── web/               React 18 + Vite + react-router
│   └── mobile/            Expo 57 / React Native 0.86 — not an npm workspace, own node_modules
├── packages/
│   ├── i18n/              English + Tamil strings and the t() translator, shared by both apps
│   ├── theme/             Design tokens (colour, type, spacing), shared by both apps
│   ├── db/                Prisma schema (legacy)
│   └── shared/            Loan engine + domain types (legacy)
├── docs/                  This manual, API manual, schema, Postman collection
├── docker-compose.yml     PostgreSQL 16
└── .env.example           Every environment variable, documented
```

npm workspaces cover `packages/*`, `apps/api` and `apps/web`. The mobile app is installed
separately (`npm run install:mobile`) and consumes `@lms/i18n` and `@lms/theme` through `file:`
links; `metro.config.js` adds the repo root to Metro's watch folders so edits to those packages
hot-reload.

## 3. Prerequisites

| Tool | Version | For |
|---|---|---|
| Node.js | 20+ | web, mobile, Node stub |
| JDK | 17+ | Spring API (Maven comes from the `./mvnw` wrapper) |
| PostgreSQL | 14+ | Spring API. `docker compose up -d db` gives you 16 with user, password and database all `lms` |
| Android Studio / Xcode | current | native mobile builds only; Expo Go or the web target need neither |

## 4. First run

```bash
# 1. Dependencies
npm install
npm run install:mobile            # only if you will run the mobile app

# 2. Environment
cp .env.example .env              # the dev profile needs nothing changed

# 3. Database
docker compose up -d db
#    …or on an existing PostgreSQL, once, as a superuser:
#    create role lms login password 'lms';  create database lms owner lms;

# 4. API — http://localhost:4000
npm run dev:api:spring

# 5. Web — http://localhost:5173
npm run dev:web

# 6. Mobile
npm run dev:mobile                # Expo dev server; press a / i, or scan with Expo Go
npm run dev:mobile:web            # the mobile app in a browser, port 8081
```

On first start Flyway creates the tables, and the `dev` profile seeds a demo branch when the
database is empty: 4 lines, 9 customers, 9 loans, 4 applications, dated back from today so the
collection sheet is always live. All demo accounts use the password `Demo@12345`:

| Email | Role |
|---|---|
| `admin@demo.lms` | Admin |
| `anitha@demo.lms` | Manager |
| `saravanan@demo.lms`, `priya@demo.lms`, `vetrivel@demo.lms`, `kalaiselvi@demo.lms` | Loan officer, one line each |

Check it:

```bash
curl localhost:4000/health        # {"ok":true}
```

To reset the demo data, drop and recreate the database (`docker compose down -v && docker compose up -d db`)
and restart the API.

### npm scripts (repo root)

| Script | Does |
|---|---|
| `dev:api:spring` | Spring API with the `dev` profile |
| `test:api:spring` | Spring API tests (H2 in memory; no PostgreSQL needed) |
| `dev:web` / `build:web` | Vite dev server / type-check and production build to `apps/web/dist` |
| `dev:mobile` / `dev:mobile:web` | Expo dev server / Expo web |
| `install:mobile` / `typecheck:mobile` | Mobile has its own install and type-check |
| `typecheck` | `tsc --noEmit` in every workspace (see known breakage above) |
| `dev:api` | The Node stub. Not needed when the Spring API is running |
| `db:generate` / `db:migrate` / `db:seed` | Prisma (legacy). **Do not run `db:migrate` against the database the Spring API uses** |

## 5. Configuration

All variables are documented in `.env.example`. The Spring API reads real environment variables
(it does not load `.env`); the `dev` profile supplies local defaults for the required ones.

| Variable | Used by | Default | Notes |
|---|---|---|---|
| `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` | Spring API | `jdbc:postgresql://localhost:5432/lms`, `lms`, – | Password is required outside `dev` |
| `PORT` | both APIs | `4000` | |
| `JWT_SECRET` | Spring API | blank | Base64, 32+ bytes: `openssl rand -base64 48`. Blank means a random key per start, signing everyone out on restart |
| `JWT_ACCESS_TTL` / `MOBILE_JWT_TTL` | Spring API | `8h` / `30d` | Normal / "keep me signed in" token lifetime |
| `KYC_ENCRYPTION_KEY` | Spring API | – (required) | Base64 AES key: `openssl rand -base64 32`. **Changing it makes stored ID numbers unreadable.** Back it up with the database |
| `CORS_ORIGINS` | both APIs | `http://localhost:5173,http://localhost:8081` | Comma-separated. `dev` allows any origin so phones on the LAN work |
| `LMS_STORAGE_DIR` | Spring API | `./data/uploads` | KYC photos, on local disk |
| `LMS_ZONE` | Spring API | `Asia/Kolkata` | Decides "today" for due dates and receipts |
| `MAIL_HOST`, `MAIL_PORT` | Spring API | blank, `587` | SMTP server for password reset links. Blank host = nothing is sent; the API logs that a mail was due. Mail goes out in the background, so a slow server doesn't delay the request |
| `MAIL_USERNAME`, `MAIL_PASSWORD` | Spring API | blank | SMTP login (for Gmail, an app password) |
| `MAIL_STARTTLS` / `MAIL_SSL` / `MAIL_SMTP_AUTH` | Spring API | `true` / `false` / `true` | Port 587: STARTTLS. Port 465: `MAIL_SSL=true`, `MAIL_STARTTLS=false` |
| `MAIL_FROM` | Spring API | `Finance Easy <no-reply@localhost>` | Sender. Most providers only accept a verified address |
| `MAIL_RESET_URL` | Spring API | `http://localhost:5173/reset-password` | The web app's reset page; the emailed link appends `?token=…`. Set it to the public web address in production |
| `ANTHROPIC_API_KEY` | both APIs | none | AI assistant. Server-side only |
| `ANTHROPIC_MODEL` | Spring API | `claude-opus-5` | The Node stub hard-codes its model |
| `VITE_API_URL` | web | `http://localhost:4000` | |
| `VITE_GOOGLE_MAPS_API_KEY` | web | blank | Optional. Without it the route page falls back to a keyless directions embed |
| `EXPO_PUBLIC_API_URL` | mobile | `http://10.0.2.2:4000` | Reserved: no mobile code reads it yet. `10.0.2.2` is the host machine from the Android emulator. Lives in `apps/mobile/.env` |
| `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | mobile | blank | Optional, Android only, baked in at native build time |

`DATABASE_URL`, `OTP_*` and `SMS_*` in `.env.example` belong to the legacy Node/Prisma design and
are not read by the Spring API.

Never run the `dev` profile outside your own machine: it has a fixed KYC key, open CORS, returns
password-reset tokens in the response and seeds demo accounts with a known password.

## 6. Backend (`apps/api-spring`)

Java 17 · Spring Boot 3.5 · Spring Data JPA · Spring Security · Flyway · PostgreSQL · jjwt ·
anthropic-java · Lombok.

### Package map (`com.microfin.lms`)

| Package | Holds |
|---|---|
| `web` | Controllers and their request records. Validation annotations live here; `Rules` has the shared limits |
| `service` | Business logic and the response records (`CustomerView`, `LoanDetail`, …) |
| `domain` | JPA entities and `Enums` |
| `repo` | Spring Data repositories |
| `loan` | `LoanCalculator` — pure pricing and schedule maths |
| `security` | `JwtService`, `JwtAuthFilter`, `CurrentUser`, `LoginThrottle` |
| `common` | `ApiException` + handler, `AuditService`, `CodeService`, `IdNumberCipher`, `Today`, `Mailer` |
| `config` | `SecurityConfig`, `AppProperties` (the typed `lms.*` settings) |

### How a request flows

1. `JwtAuthFilter` verifies the bearer token, **reloads the user from the database**, and checks
   they are active and the token's `ver` claim matches `users.token_version`. That is why
   suspending a user or changing a password takes effect immediately.
2. `SecurityConfig` lets the public routes through and requires authentication on the rest.
   Manager-only handlers carry `@PreAuthorize(UserController.MANAGERS)`.
3. The controller validates the body (`@Valid`) and calls a service with `CurrentUser.get()`.
4. The service scopes every lookup by `current.companyId()`, does its work in a transaction,
   writes an audit entry, and returns a view record.
5. `ApiExceptionHandler` turns failures into `{ code, message, errors }`.

### Rules worth knowing before you change anything

- **Money is whole rupees in a `long`.** No `double`, no `BigDecimal` amounts, no paise.
- **Tenancy is enforced by hand.** There is no Hibernate filter; a repository call that forgets
  `companyId` leaks across companies. Follow the existing `findByCompanyIdAnd…` pattern.
- **Use `Today`, not `LocalDate.now()`.** It applies `LMS_ZONE` and the injectable `Clock`, which
  is what lets tests move time.
- **Balances are derived.** `PortfolioService.LoanState` computes paid, outstanding, overdue and
  state from the installments on each read. Do not add stored copies.
- **`LoanCalculator` must agree with `lib/loan.ts`** in both apps. `LoanCalculatorTest` pins it
  against the apps' sample loans; change all three together.
- **Throw `ApiException`** with a stable upper-snake `code` for anything the client can act on.
  New codes go in the [error reference](API_MANUAL.md#error-code-reference).
- **ID numbers never go in logs, audit details or the AI snapshot.**
- **Row locks** (`findForUpdate`) serialise receipts on a loan and decisions on an application.
  Keep new write paths on those rows behind the same lock.

### Loan maths

Flat interest on the original principal for the whole tenure; nothing amortises.

```
totalInterest = round_half_up(principal × annualRatePct × months / 1200)

            POST (interest collected with installments)   PRE (interest deducted up front)
payable     principal + totalInterest                     principal
handed over principal − fee                               principal − totalInterest − fee
emi         ceil(payable / months)                        ceil(payable / months)
```

Installments fall due monthly from the disbursal date (the 31st rolls to the last day of shorter
months). Each is the EMI except the last, which takes the remainder so the schedule sums exactly
to `payable`.

### Adding an endpoint

1. Schema change, if any: a new `V<n>__name.sql` plus the entity ([details](DATABASE_SCHEMA.md#changing-the-schema)).
2. Repository method, scoped by company.
3. Service method: `@Transactional`, takes `CurrentUser`, returns a view record, calls `audit.record(…)` on writes.
4. Controller: request record with validation annotations, `@PreAuthorize(UserController.MANAGERS)` if manager-only.
5. A case in `ApiFlowTest`.
6. A row in the [API manual](API_MANUAL.md) and a request in the Postman collection.

### Tests

```bash
npm run test:api:spring           # or: cd apps/api-spring && ./mvnw test
```

| Test | Covers |
|---|---|
| `LoanCalculatorTest` (6) | Pricing and schedules against the apps' sample loans |
| `ApiFlowTest` (3) | End-to-end through MockMvc: an application taken through to a closed loan, isolation between companies, account security |

They run on H2 in PostgreSQL mode with the real Flyway migration and `ddl-auto: validate`.
`MutableClock` lets a test step time forward to make installments fall due. All 9 pass.

### AI assistant

`AssistantService` builds a JSON snapshot of the caller's portfolio (collection efficiency and
risk figures from `InsightsService.assistantSnapshot` — no ID numbers), sends it with the conversation to the Anthropic API using the model in
`ANTHROPIC_MODEL`, and streams the reply back as server-sent events. Without `ANTHROPIC_API_KEY`
the endpoint still answers, with a single `error` event.

## 7. Front ends

### Shared packages

**`@lms/i18n`** — `t('loans.title')` with typed keys, `tp()` for plurals, locales `en` and `ta`.
Strings live in `packages/i18n/src/locales/<locale>/<area>.ts`; the `ta` files must mirror the
`en` shape or the package fails to type-check. The active locale is module state; each app wraps
its tree in a provider (`apps/web/src/i18n.tsx`, `apps/mobile/src/i18n.ts`) that persists the
choice (`localStorage` / `AsyncStorage`) and remounts on change. Add every user-visible string in
both languages.

**`@lms/theme`** — colour, type, spacing, radius and elevation tokens as plain data. Web injects
them as CSS variables at boot (`tokensToCssVars()`), and `global.css` only reads `var(--…)`: no
hex literals in CSS. Mobile re-exports them from `src/theme`. See `packages/theme/README.md`.

### Web (`apps/web`)

React 18, Vite, react-router 6, plain CSS. No state library and no data-fetching library.

| Path | Holds |
|---|---|
| `src/App.tsx` | Route table. Auth pages sit outside `AppShell`; everything else inside it |
| `src/pages/` | One file per screen |
| `src/components/` | `AppShell`, `Sidebar`, `TopBar`, form fields, `RouteMap`, charts |
| `src/lib/data.ts` | The in-memory store and every read/write the pages use |
| `src/lib/loan.ts` | Client-side loan maths (twin of `LoanCalculator`) |
| `src/lib/assistant.ts` | The one real API call: streams `POST /ai/chat` |
| `src/lib/use*.ts` | `useSyncExternalStore` hooks over `data.ts` |

Routes: `/dashboard`, `/collection`, `/collection/route`, `/collection/:id`, `/lines`,
`/lines/new`, `/customers`, `/customers/new`, `/customers/:id`, `/customers/:id/proof`,
`/customers/:id/location`, `/loans`, `/loans/new`, `/loans/:id`, `/approvals`, `/approvals/:id`,
`/reports`, `/insights`, `/calculator`, `/settings`, plus `/sign-in`, `/sign-up`,
`/forgot-password`. There is no route guard yet: sign-in does not gate anything.

### Mobile (`apps/mobile`)

Expo 57, React Native 0.86, React Navigation 7 (native stack + bottom tabs), `react-native-maps`,
`expo-location`, `expo-image-picker`.

| Path | Holds |
|---|---|
| `App.tsx` | Fonts, providers, navigation container |
| `src/navigation/` | `RootNavigator` (Auth → Main tabs → detail screens), `MainTabs` (Dashboard, Collection, Customers, Loans, Reports), `types.ts` |
| `src/screens/` | One file per screen, mirroring the web pages |
| `src/components/` | Shared UI; `PinMap.tsx` / `PinMap.web.tsx` split native and web maps |
| `src/lib/` | Same `data.ts` / `loan.ts` / hooks pattern as web |
| `app.json` + `app.config.js` | Static Expo config + what must not be committed (the Maps key) |

`android/` and `ios/` are generated by `npx expo prebuild` and are git-ignored; recreate rather
than edit them. Release signing material lives in `apps/mobile/credentials/`, also git-ignored —
back it up separately, because losing the keystore means a new app identity. App id:
`ltd.billionbrains.lms`.

The web and mobile `lib/` folders are copies, not a shared package. A change to `data.ts`,
`loan.ts` or `validate.ts` in one usually needs making in the other.

## 8. Wiring an app screen to the API

Nothing here exists yet; this is the suggested shape.

1. **A client module** (`src/lib/api.ts`) that prefixes `VITE_API_URL` / `EXPO_PUBLIC_API_URL`,
   attaches `Authorization: Bearer <token>`, parses `{ code, message, errors }` into a typed
   error, and signs the user out on `401`.
2. **Session.** Call `POST /auth/sign-in`, keep the token (web: memory + `localStorage`;
   mobile: `expo-secure-store` rather than `AsyncStorage`), add a route guard, and replace the
   hard-coded `user` in `data.ts` with `GET /auth/me`.
3. **One screen at a time.** Each exported reader in `data.ts` has an endpoint returning the same
   shape — `getCollectionSheet` ↔ `GET /collection/sheet`, the customer list ↔ `GET /customers`,
   and so on. Swap the body, keep the signature, and the pages do not change.
4. **Map server errors to fields.** `errors[].field` matches the request body's property names.
5. **Offline collection (mobile).** Mint a UUID per collection attempt, queue
   `{ clientOpId, loanId, payment }`, and flush through `POST /sync/payments`. Drop items that
   come back `APPLIED` or `DUPLICATE`; surface `REJECTED`. This path is idempotent by design.
6. **KYC photos** need the auth header, so fetch them and use a blob / file URI instead of
   putting the URL straight into an image tag.
7. **AI chat.** `lib/assistant.ts` already calls `/ai/chat`; it only needs the token added.

## 9. Not built yet

From `apps/api-spring/README.md`, with consequences:

- **Apps are not wired to the API** (above).
- **Mobile OTP + MPIN login.** Only email + password exists.
- **Part payments, penalties, reversals, write-offs, loan products.** A wrong receipt cannot be
  undone through the API today.
- **Line frequency does not drive schedules.** Every loan is monthly regardless of the line being
  daily or weekly.
- **Loan officers are not confined to their line**; any signed-in user can act on any line in
  their company.
- **Report export** (CSV / PDF), **notifications**, **pagination**.
- **Single instance only.** Uploads are on local disk and sign-in throttling is in memory. Move
  both to shared storage before running more than one API instance.
- **No CI, Dockerfile or deployment config** in the repository.

## 10. Deploying the API

There is no pipeline; this is the minimum by hand.

```bash
cd apps/api-spring
./mvnw clean package              # target/lms-api-0.1.0.jar
java -jar target/lms-api-0.1.0.jar
```

Run it **without** the `dev` profile and set, at least:

| Variable | Why |
|---|---|
| `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` | The production database. Flyway migrates it on start |
| `JWT_SECRET` | Otherwise every restart signs everyone out |
| `KYC_ENCRYPTION_KEY` | Required. Store it as carefully as the database backups |
| `CORS_ORIGINS` | The real web origin(s) |
| `LMS_STORAGE_DIR` | A persistent, backed-up path |

Put it behind TLS. The first admin is created through `POST /auth/sign-up`, which is public:
anyone who can reach the API can register a new (separate, empty) company.

The web app is a static bundle: `VITE_API_URL=https://api.example.com npm run build:web`, then
serve `apps/web/dist` with a fallback to `index.html` for client-side routes.

## 11. Troubleshooting

| Symptom | Cause |
|---|---|
| API exits with `Could not resolve placeholder 'KYC_ENCRYPTION_KEY'` or a datasource password error | Started without the `dev` profile and without those variables |
| `Schema-validation: missing table/column` at boot | The database has tables from somewhere else (for instance Prisma's `db:migrate`), or an entity changed without a migration |
| `Port 4000 was already in use` | The Node stub (`dev:api`) is running; stop one of them |
| Everyone signed out after a restart | `JWT_SECRET` is blank |
| Demo sign-in answers `BAD_CREDENTIALS` straight after start | The seeder runs just after the port opens; retry in a second. Or the database was not empty, so nothing was seeded |
| `429 TOO_MANY_ATTEMPTS` while testing | 5 failures in 15 minutes for that email. Wait, or restart the API (the counter is in memory) |
| Stored ID numbers fail to decrypt | `KYC_ENCRYPTION_KEY` changed |
| CORS error from a phone or another host | Add the origin to `CORS_ORIGINS`, or use the `dev` profile locally |
| Mobile cannot reach the API (once wired) | `10.0.2.2` only works from the Android emulator. On a device use the machine's LAN IP in `apps/mobile/.env` |
| Map shows no tiles on Android | `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` is read at native build time; rebuild after setting it |
| AI chat returns "not configured" | `ANTHROPIC_API_KEY` is not set in the API's environment |
