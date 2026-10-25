# LMS API (Spring Boot + PostgreSQL)

The backend for the microfinance LMS: sign-in and staff accounts, collection lines, customers
with KYC and doorstep pins, loan applications through approval and disbursal, installment
receipts, the collection sheet and routes, dashboard, insights, reports, and the AI assistant.

Java 17 · Spring Boot 3.5 · Spring Data JPA · Spring Security (JWT) · Flyway · PostgreSQL.

It replaces the Node stub in `apps/api` (which only served `/ai/chat`). Both default to port
4000, so run one or the other.

> The web and mobile apps load everything from this API after sign-in (`loadPortfolio` in each
> app's `lib/data.ts`) and send every save to it. Response shapes follow the types in `lib/data.ts`.

## Run it

Prerequisites: JDK 17+, PostgreSQL 14+.

```sql
-- once, as a PostgreSQL superuser
create role lms login password 'lms';
create database lms owner lms;
```

```bash
cd apps/api-spring
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev   # http://localhost:4000
./mvnw test                                             # in-memory database, no PostgreSQL needed
```

Flyway creates the tables on first start. The `dev` profile also loads the sample branch the
screens were designed with (4 lines, 9 customers, 9 loans, 4 applications), dated back from
today so the collection sheet is always live. Demo accounts, all with password `Demo@12345`:

| Email | Role |
|---|---|
| `admin@demo.lms` | Admin |
| `anitha@demo.lms` | Manager |
| `saravanan@demo.lms` | Loan officer: Line 04 · Velachery and Line 07 · Mylapore |
| `vetrivel@demo.lms` | Loan officer: Line 01 · T. Nagar |
| `priya@demo.lms` | Loan officer: Line 02 · Perambur |
| `kalaiselvi@demo.lms` | Loan officer, no line yet |

A loan officer sees only their own lines and those lines' customers, loans, applications, receipts
and figures; anything else answers 404. Managers and admins see the whole company.

```bash
TOKEN=$(curl -s localhost:4000/api/v1/auth/sign-in -H 'Content-Type: application/json' \
  -d '{"email":"anitha@demo.lms","password":"Demo@12345"}' | jq -r .token)
curl -s localhost:4000/api/v1/collection/sheet -H "Authorization: Bearer $TOKEN" | jq
```

## Configuration

The `dev` profile supplies local defaults for everything marked *required*. Never use the `dev`
profile outside your own machine.

| Variable | Meaning | Default |
|---|---|---|
| `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` | PostgreSQL connection (JDBC URL) | `jdbc:postgresql://localhost:5432/lms`, `lms`, *required* |
| `PORT` | HTTP port | `4000` |
| `JWT_SECRET` | Base64 signing key, 32+ bytes (`openssl rand -base64 48`). Blank = random key per start | blank |
| `JWT_ACCESS_TTL` / `MOBILE_JWT_TTL` | Token lifetime normally / with "keep me signed in" | `8h` / `30d` |
| `KYC_ENCRYPTION_KEY` | Base64 AES key that encrypts ID numbers at rest (`openssl rand -base64 32`). **Changing it makes stored ID numbers unreadable** | *required* |
| `CORS_ORIGINS` | Comma-separated origins allowed to call the API | `http://localhost:5173,http://localhost:8081` |
| `LMS_STORAGE_DIR` | Where uploaded KYC photos are kept | `./data/uploads` |
| `LMS_ZONE` | Zone that decides "today" for due dates and receipts | `Asia/Kolkata` |
| `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` | AI assistant credentials and model | none, `claude-opus-5` |
| `MAIL_HOST`, `MAIL_PORT` | SMTP server for password reset mail. Blank host = nothing is sent, only logged | blank, `587` |
| `MAIL_USERNAME`, `MAIL_PASSWORD` | SMTP login | blank |
| `MAIL_STARTTLS` / `MAIL_SSL` / `MAIL_SMTP_AUTH` | STARTTLS (port 587) / implicit TLS (port 465) / log in to the server | `true` / `false` / `true` |
| `MAIL_FROM` | Sender. Most providers only accept an address they have verified | `Finance Easy <no-reply@localhost>` |
| `MAIL_RESET_URL` | The web app's reset page; the emailed link appends `?token=…` | `http://localhost:5173/reset-password` |

## Rules the API enforces

- **Money** is whole rupees (`BIGINT`), never a float. Field collections do not handle paise.
- **Companies are isolated.** Sign-up creates a company and its admin; every row belongs to one
  company and no request can read or write another's.
- **Roles.** Loan officers onboard customers, capture KYC and pins, submit applications and
  collect. Managers and admins also create lines and staff, approve, reject and disburse, and
  see reports and the audit trail. Only admins manage manager and admin accounts.
- **Loans** are flat-interest with monthly installments. `POST` collects interest with the
  installments; `PRE` deducts interest and fee from the cash handed over. The maths in
  `LoanCalculator` matches `lib/loan.ts` in the apps and is tested against their sample loans.
- **Applications**: one open application per customer; the agreed EMI must recover the loan
  within the tenure; the disbursal date may be at most 7 days ahead; approval needs identity
  proof on file. Disbursal books the loan dated today and writes its whole schedule.
- **Receipts**: one installment in full at a time, oldest first, only once it has fallen due,
  never dated in the future. The last receipt closes the loan. A `clientOpId` makes a retry
  return the original receipt instead of creating another.
- **Balances are derived** from the installments on every read; nothing is stored twice.
- **ID numbers** (Aadhaar, PAN, ...) are AES-GCM encrypted in the database and never written to
  logs, the audit trail or the AI snapshot.
- **Audit trail**: sign-ins, decisions, disbursals, receipts and edits are recorded with who did them.

## Endpoints (`/api/v1`, bearer token unless marked public)

| Method | Path | Who | Purpose |
|---|---|---|---|
| POST | `/auth/sign-up` | public | Register a company and its admin |
| POST | `/auth/sign-in` | public | Email + password → token (`remember: true` for the long-lived one) |
| POST | `/auth/forgot-password`, `/auth/reset-password` | public | Password reset by emailed token |
| GET | `/auth/me` | any | The signed-in user |
| POST | `/auth/change-password` | any | Change own password; older tokens stop working |
| GET, POST | `/users` · PATCH `/users/{id}` | manager | Staff accounts: create, change role, suspend |
| GET | `/officers` | any | Staff a line can be assigned to |
| GET, PUT | `/company` | any / manager | Name, office location, daily target |
| GET | `/lines`, `/lines/{id}` | any | Lines with today's due and collected |
| POST, PUT | `/lines`, `/lines/{id}` | manager | Create or edit a line |
| GET | `/lines/{id}/route` | any | Today's walking order, nearest doorstep first |
| GET, POST | `/customers` · GET, PUT `/customers/{id}` | any | Customers (`query`, `lineId`, `status` filters) |
| PUT, DELETE | `/customers/{id}/geo` | any | Set or clear the doorstep pin |
| PUT | `/customers/{id}/kyc` | any | Add or replace the identity proof of one type, multipart: `type`, `number`, optional `front`, `back` photos |
| DELETE | `/customers/{id}/kyc/{type}` | any | Remove one identity proof and its photos |
| GET | `/customers/{id}/kyc/{type}/{front\|back}` | any | The stored photo |
| POST | `/loans/price` | any | Price a loan for the form preview |
| GET, POST | `/applications` · GET `/applications/{id}` | any | List, submit, view |
| POST | `/applications/{id}/approve`, `/reject`, `/disburse` | manager | Decide and pay out |
| GET | `/loans`, `/loans/{id}` | any | Loan book (`query`, `state`, `lineId`, `customerId`, `sort`) and one loan with schedule and receipts |
| GET | `/collection/sheet` | any | Today's sheet, optionally `?lineId=` |
| POST | `/loans/{id}/payments` | any | Receipt the next installment |
| POST | `/sync/payments` | any | Batch of receipts captured offline; each item applied or rejected on its own |
| GET | `/dashboard`, `/insights` | any | KPIs, week of collections, arrears; efficiency and risk scores |
| GET | `/reports/portfolio-summary`, `collection-register`, `overdue-ageing`, `disbursement-register`, `line-performance`, `day-book` | manager | The six reports (`from`, `to`, `lineId` where relevant) |
| GET | `/audit-logs` | manager | Latest 200 audit entries |
| POST | `/ai/chat` (also at `/ai/chat` without the prefix) | any | AI assistant, streamed as server-sent events |
| GET | `/health` (no prefix) | public | Liveness |

Errors are `{ "code": "...", "message": "...", "errors": [{ "field", "message" }] }`.

## Not done yet

- **Mobile OTP + MPIN login** from the original brief. The apps only have email + password screens.
- **Part payments, penalties, reversals, write-offs and configurable loan products.** The screens
  collect one full installment at a time with no late fee, so the API does the same.
- **Notifications** have no feed; the apps derive header alerts from the portfolio (approvals, 30+ day arrears, today's sheet).
- **Report export** (CSV/PDF); reports are JSON.
- **Uploads live on local disk** and sign-in throttling is in memory, so run a single instance
  until those move to shared storage.
