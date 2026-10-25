# API manual

The REST API served by `apps/api-spring` (Spring Boot). 48 operations: 47 under `/api/v1`, plus
`/health`. A ready-to-run Postman collection covering all of them is in
[`docs/postman`](postman/); see [Postman collection](#postman-collection).

| | |
|---|---|
| Base URL (local) | `http://localhost:4000` |
| Prefix | `/api/v1` (except `/health`, and `/ai/chat` which is served both with and without it) |
| Format | JSON in, JSON out, UTF-8. KYC upload is `multipart/form-data`; AI chat answers `text/event-stream` |
| Auth | `Authorization: Bearer <token>` on everything except the five public routes |
| Versioning | The path prefix. There is no OpenAPI/Swagger document; this file and the controllers in `com.microfin.lms.web` are the reference |

Sample responses below were captured from the `dev` profile's demo data.

## Quick start

```bash
npm run dev:api:spring          # http://localhost:4000, demo branch seeded

TOKEN=$(curl -s localhost:4000/api/v1/auth/sign-in -H 'Content-Type: application/json' \
  -d '{"email":"anitha@demo.lms","password":"Demo@12345"}' | jq -r .token)

curl -s localhost:4000/api/v1/collection/sheet -H "Authorization: Bearer $TOKEN" | jq
```

Demo accounts (password `Demo@12345`): `admin@demo.lms` (admin), `anitha@demo.lms` (manager),
`saravanan@demo.lms`, `priya@demo.lms`, `vetrivel@demo.lms`, `kalaiselvi@demo.lms` (loan officers).

## Conventions

**Ids.** Resources are addressed by their human code, and that code is what the `id` field
holds: lines `L04`, customers `C-0007`, applications `APP-3104`, loans `LN-20418`. Users are the
exception and use a numeric id.

**Money.** Whole rupees as JSON integers. Never decimals.

**Dates.** Business dates are `YYYY-MM-DD`. Timestamps are ISO-8601 UTC (`2026-10-11T06:15:00.891Z`).
"Today" for due dates and receipts is the server's `LMS_ZONE` (default `Asia/Kolkata`).

**Enum casing.** It is not uniform; send and expect exactly these:

| Field | Values |
|---|---|
| `role` | `ADMIN`, `MANAGER`, `LOAN_OFFICER` |
| user `status` | `ACTIVE`, `SUSPENDED` |
| loan `type` | `POST`, `PRE` |
| payment `mode` | `CASH`, `UPI` |
| KYC `type` | `AADHAAR`, `PAN`, `VOTER_ID`, `DRIVING_LICENSE`, `PASSPORT` |
| line `frequency` | `daily`, `weekly`, `monthly`, `monthly-interest` |
| customer `status` | `pending`, `approved`, `active` |
| application `status` | `pending`, `approved`, `rejected`, `disbursed` |
| loan `state` | `active`, `overdue`, `closed` |
| installment `status` | `upcoming`, `due`, `overdue`, `paid` |
| sheet row `status` | `due`, `overdue`, `collected` |

**Lists** are plain JSON arrays. There is no pagination; every list returns the whole set for
the company.

**Tenancy.** Every request is scoped to the caller's company. Another company's codes answer `404`.

## Authentication

1. `POST /api/v1/auth/sign-in` returns `{ token, expiresAt, user }`.
2. Send `Authorization: Bearer <token>` on every other call.
3. On `401`, sign in again. There is no refresh token.

| | |
|---|---|
| Token | JWT, HS256. Claims: `sub` (user id), `ver` (token version), `iat`, `exp` |
| Lifetime | 8 h (`JWT_ACCESS_TTL`); 30 d with `remember: true` (`MOBILE_JWT_TTL`) |
| Revocation | The account is re-read on every request. Suspending a user, or any password change or reset, invalidates their existing tokens at once |
| Throttling | 5 failed sign-ins for an email within 15 minutes → `429` until the window passes (in memory, per instance) |
| Signing key | `JWT_SECRET`. If blank the server uses a random key, so every token dies on restart |

### Roles

| Capability | Loan officer | Manager | Admin |
|---|:-:|:-:|:-:|
| Read lines, customers, applications, loans, sheet, dashboard, insights | ✓ | ✓ | ✓ |
| Create / edit customers, pins, KYC | ✓ | ✓ | ✓ |
| Submit applications, record payments, sync | ✓ | ✓ | ✓ |
| AI assistant | ✓ | ✓ | ✓ |
| Create / edit lines; edit company | | ✓ | ✓ |
| Approve, reject, disburse | | ✓ | ✓ |
| Reports, audit log | | ✓ | ✓ |
| List / create / edit loan-officer accounts | | ✓ | ✓ |
| Create / edit manager and admin accounts | | | ✓ |

A loan officer is **not** restricted to their own line: every signed-in user can read and write
across all lines of their company.

## Errors

Every error has the same body:

```json
{
  "code": "VALIDATION_FAILED",
  "message": "Some fields are invalid",
  "errors": [
    { "field": "annualRatePct", "message": "must be greater than 0" },
    { "field": "principal", "message": "must be greater than or equal to 1000" }
  ]
}
```

`errors` is filled only for `VALIDATION_FAILED`. Branch on `code`, show `message`.

| Status | Code | When |
|---|---|---|
| 400 | `VALIDATION_FAILED` | A body field broke a rule; see `errors` |
| 400 | `BAD_REQUEST` | Malformed JSON, missing body, or an unknown enum / unparsable date |
| 401 | `UNAUTHENTICATED` | Missing, expired or revoked token |
| 401 | `BAD_CREDENTIALS` | Wrong email or password |
| 403 | `FORBIDDEN` | Role does not allow it, or the account is suspended |
| 404 | `NOT_FOUND` | No such line / customer / application / loan / user / image in this company |
| 409 | *(various)* | The request is valid but the state does not allow it; listed per endpoint |
| 413 | `FILE_TOO_LARGE` | Upload over 5 MB per file or 12 MB per request |
| 429 | `TOO_MANY_ATTEMPTS` | Sign-in throttled |
| 500 | `INTERNAL_ERROR` | Unexpected; details are in the server log only |

Framework errors Spring renders itself (`405`, a missing required query parameter) use Spring's
default error body, not this shape.

## Endpoint index

| Method | Path | Who | Purpose |
|---|---|---|---|
| GET | `/health` | public | Liveness |
| POST | `/auth/sign-up` | public | Register a company and its admin |
| POST | `/auth/sign-in` | public | Email + password → token |
| POST | `/auth/forgot-password` | public | Start a password reset |
| POST | `/auth/reset-password` | public | Finish a password reset |
| GET | `/auth/me` | any | The signed-in user |
| POST | `/auth/change-password` | any | Change own password |
| GET | `/users` | manager | List staff |
| POST | `/users` | manager | Create a staff account |
| PATCH | `/users/{id}` | manager | Rename, change role, suspend |
| GET | `/officers` | any | Active staff, for assigning a line |
| GET | `/company` | any | Company settings |
| PUT | `/company` | manager | Update company settings |
| GET | `/lines` | any | Lines with today's figures |
| POST | `/lines` | manager | Create a line |
| GET | `/lines/{id}` | any | One line |
| PUT | `/lines/{id}` | manager | Edit a line |
| GET | `/lines/{id}/route` | any | Today's walking order |
| GET | `/customers` | any | List / search customers |
| POST | `/customers` | any | Create a customer |
| GET | `/customers/{id}` | any | One customer |
| PUT | `/customers/{id}` | any | Edit a customer |
| PUT | `/customers/{id}/geo` | any | Set the doorstep pin |
| DELETE | `/customers/{id}/geo` | any | Clear the doorstep pin |
| PUT | `/customers/{id}/kyc` | any | Add or replace an identity proof (multipart) |
| DELETE | `/customers/{id}/kyc/{type}` | any | Remove an identity proof |
| GET | `/customers/{id}/kyc/{type}/{side}` | any | Download a proof photo |
| POST | `/loans/price` | any | Price a loan, save nothing |
| GET | `/applications` | any | List applications |
| POST | `/applications` | any | Submit an application |
| GET | `/applications/{id}` | any | One application |
| POST | `/applications/{id}/approve` | manager | Approve |
| POST | `/applications/{id}/reject` | manager | Reject |
| POST | `/applications/{id}/disburse` | manager | Book the loan |
| GET | `/loans` | any | Loan book |
| GET | `/loans/{id}` | any | Loan with schedule and receipts |
| GET | `/collection/sheet` | any | Today's collection sheet |
| POST | `/loans/{id}/payments` | any | Receipt the next installment |
| POST | `/sync/payments` | any | Batch of offline receipts |
| GET | `/dashboard` | any | Home-screen figures |
| GET | `/insights` | any | Efficiency and risk |
| GET | `/reports/portfolio-summary` | manager | Report 1 |
| GET | `/reports/collection-register` | manager | Report 2 |
| GET | `/reports/overdue-ageing` | manager | Report 3 |
| GET | `/reports/disbursement-register` | manager | Report 4 |
| GET | `/reports/line-performance` | manager | Report 5 |
| GET | `/reports/day-book` | manager | Report 6 |
| GET | `/audit-logs` | manager | Latest 200 audit entries |
| POST | `/ai/chat` | any | AI assistant (SSE) |

All paths except `/health` are under `/api/v1`. "manager" means MANAGER or ADMIN.

---

## Health

### `GET /health`

Public. `200` → `{ "ok": true }`.

## Auth

### `POST /auth/sign-up`

Public. Creates a company and its first user, who is its `ADMIN`, and signs them in.

| Field | Type | Rules |
|---|---|---|
| `companyName` | string | required, ≤ 120 |
| `fullName` | string | required, ≤ 120 |
| `email` | string | required, valid email, ≤ 254. Stored lower-cased; unique across all companies |
| `phone` | string | required, 10 digits starting 6-9 |
| `password` | string | required, 8-72 characters |

`201` → a [Session](#session). Errors: `409 EMAIL_TAKEN`.

### `POST /auth/sign-in`

Public.

```json
{ "email": "anitha@demo.lms", "password": "Demo@12345", "remember": false }
```

<a id="session"></a>`200` → Session:

```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9…",
  "expiresAt": "2026-10-11T14:12:30.587Z",
  "user": {
    "id": 2,
    "fullName": "Anitha Rajendran",
    "email": "anitha@demo.lms",
    "phone": "9000000002",
    "role": "MANAGER",
    "status": "ACTIVE",
    "company": "BillionBrains Microfinance · Chennai"
  }
}
```

Errors: `401 BAD_CREDENTIALS` (same message whether the email exists or not), `403 FORBIDDEN`
(suspended), `429 TOO_MANY_ATTEMPTS`.

### `GET /auth/me`

`200` → the `user` object above.

### `POST /auth/forgot-password`

Public. Body `{ "email": "…" }`. Always `200 { "sent": true }`, whether or not the email has an
account. **No email is sent yet** — `Mailer` only logs the request. With the `dev` profile the
response also carries `"devResetToken"` so the flow can be exercised.

### `POST /auth/reset-password`

Public. Body `{ "token": "…", "password": "…" }` (password 8-72). `204`, no body. The token is
valid for 30 minutes and works once. All of the user's existing tokens stop working.
Errors: `400 RESET_LINK_INVALID`.

### `POST /auth/change-password`

Body `{ "currentPassword": "…", "newPassword": "…" }`. `200` → a new [Session](#session); the
token used for this call and every older one stop working, so replace it with the returned one.
Errors: `400 WRONG_PASSWORD`.

## Staff and company

### `GET /users` — manager

`200` → array of user objects (as in [Session](#session)), by name.

### `POST /users` — manager

| Field | Type | Rules |
|---|---|---|
| `fullName` | string | required, ≤ 120 |
| `email` | string | required, valid, ≤ 254 |
| `phone` | string | required, 10-digit mobile |
| `password` | string | required, 8-72 |
| `role` | enum | required: `ADMIN` \| `MANAGER` \| `LOAN_OFFICER` |

`201` → user. Errors: `409 EMAIL_TAKEN`; `403 FORBIDDEN` when a manager asks for a `MANAGER` or
`ADMIN` account.

### `PATCH /users/{id}` — manager

`{id}` is the numeric user id. Send only what changes: `fullName`, `phone`, `role`, `status`.
`200` → user. Errors: `400 OWN_ROLE`, `400 OWN_STATUS` (you cannot change your own role or
suspend yourself), `403 FORBIDDEN` (manager touching a manager/admin account), `404`.

### `GET /officers`

Active staff of every role, for the "assign officer" picker.

```json
[{ "id": 3, "name": "Saravanan M", "role": "LOAN_OFFICER" }]
```

### `GET /company`

```json
{ "name": "BillionBrains Microfinance · Chennai", "office": { "lat": 13.085, "lng": 80.2101 }, "dailyTarget": 25000 }
```

`office` is null until set.

### `PUT /company` — manager

All fields optional: `name` (1-120), `office` `{ lat, lng }`, `dailyTarget` (≥ 0). Only the
fields sent are changed. `200` → company.

## Lines

<a id="line"></a>Line object:

```json
{
  "id": "L01",
  "name": "Line 01 · T. Nagar",
  "officer": "Saravanan M",
  "officerId": 3,
  "frequency": "daily",
  "schedule": null,
  "accounts": 2,
  "due": 6734,
  "collected": 2600
}
```

`accounts` is the line's open loans. `due` is everything on today's sheet for the line
(including what is already collected); `collected` is what has come in today.

### `GET /lines` · `GET /lines/{id}`

`200` → array of lines by code / one line. `404` for an unknown code.

### `POST /lines` — manager · `PUT /lines/{id}` — manager

| Field | Type | Rules |
|---|---|---|
| `name` | string | required, ≤ 120, unique in the company (case-insensitive) |
| `frequency` | enum | required: `daily` \| `weekly` \| `monthly` \| `monthly-interest` |
| `schedule` | string | weekly: `Monday`…`Sunday`. monthly / monthly-interest: `1`…`28` or `Last day`. daily: ignored |
| `officerId` | number \| null | an active user of the company; null leaves the line unassigned |

`201` / `200` → line. `PUT` replaces all four fields. The code (`L05`) is assigned by the server.
Errors: `409 LINE_NAME_TAKEN`, `400 SCHEDULE_REQUIRED`, `400 UNKNOWN_OFFICER`.

### `GET /lines/{id}/route`

Today's sheet for the line, ordered into a walk: nearest unvisited doorstep first, starting from
the company office. Distances are straight-line kilometres.

```json
{
  "office": { "lat": 13.085, "lng": 80.2101 },
  "stops": [
    {
      "installment": { "id": "LN-20112-4", "customer": "Arulraj Devadoss", "customerId": "C-0004", "loanNo": "LN-20112",
                       "seq": 4, "lineId": "L04", "amount": 5000, "dueOn": "2026-10-01", "daysLate": 10, "status": "overdue" },
      "customer": { "…": "full Customer object" },
      "geo": { "lat": 12.9784, "lng": 80.2196 },
      "legKm": 11.897972054692483
    }
  ],
  "collected": [],
  "unmapped": [],
  "totalKm": 24.56206026250576
}
```

- `stops` — still to collect, in walking order. `legKm` is the distance from the previous stop.
- `collected` — receipted today: `{ installment, customer, postedAt, postedFrom, awayKm }`, where
  `awayKm` is how far from the doorstep the receipt was posted (null if either point is missing).
- `unmapped` — sheet rows whose customer has no pin.
- `totalKm` — the whole walk including the return to the office.

## Customers

<a id="customer"></a>Customer object:

```json
{
  "id": "C-0004",
  "name": "Arulraj Devadoss",
  "phone": "9884320176",
  "altPhone": null,
  "parentName": "Devadoss Anthony",
  "address": "3/118, Thiruvalluvar Street, Velachery, Chennai 600042",
  "requestedAmount": 85000,
  "lineId": "L04",
  "lineName": "Line 04 · Velachery",
  "geo": { "lat": 12.9784, "lng": 80.2196, "accuracy": 6.0, "capturedAt": "2026-09-11T06:12:14.217Z" },
  "proofs": [
    {
      "type": "AADHAAR",
      "number": "432178905612",
      "front": { "name": "aadhaar-front.jpg", "size": 182331, "url": "/api/v1/customers/C-0004/kyc/AADHAAR/front" },
      "back": null,
      "updatedAt": "2026-10-11T06:12:14.217Z"
    }
  ],
  "status": "active",
  "createdAt": "2026-10-11T06:12:14.217Z"
}
```

`geo` is null until captured. `proofs` holds at most one entry per ID type, oldest first, and is
empty until one is captured. Each `number` is returned **in full, unmasked**, to every signed-in
user of the company; it is encrypted only at rest.

### `GET /customers`

Newest first. Query, all optional: `query` (matches name, phone or code), `lineId`, `status`.

### `GET /customers/{id}`

`200` → customer. `404`.

### `POST /customers` · `PUT /customers/{id}`

| Field | Type | Rules |
|---|---|---|
| `name` | string | required, ≤ 120 |
| `phone` | string | required, 10-digit mobile, unique in the company |
| `altPhone` | string | optional (`""` or a 10-digit mobile), must differ from `phone` |
| `parentName` | string | required, ≤ 120 |
| `address` | string | required, ≤ 300 |
| `requestedAmount` | integer | 1,000 – 1,000,000 |
| `lineId` | string | required, an existing line code |

`201` / `200` → customer. New customers start `pending`. `PUT` replaces all of these fields.
Errors: `409 PHONE_TAKEN`, `400 UNKNOWN_LINE`, `400 ALT_PHONE_SAME`, and on `PUT` `409 LINE_IN_USE`
when moving a customer who has a running loan or open application to another line.

### `PUT /customers/{id}/geo` · `DELETE /customers/{id}/geo`

```json
{ "lat": 13.0418, "lng": 80.2341, "accuracy": 8 }
```

`lat` −90…90 and `lng` −180…180 required; `accuracy` (metres, ≥ 0) optional. Coordinates are
stored to 6 decimal places. Both calls answer `200` → customer.

### `PUT /customers/{id}/kyc`

`multipart/form-data`:

| Part | Kind | Rules |
|---|---|---|
| `type` | text | required: `AADHAAR` \| `PAN` \| `VOTER_ID` \| `DRIVING_LICENSE` \| `PASSPORT` |
| `number` | text | required. Spaces and hyphens are stripped and letters upper-cased before a per-type format check (Aadhaar: 12 digits not starting 0/1; PAN: `AAAAA9999A`; Voter ID: `AAA9999999`; driving licence: 2 letters + 13 digits; passport: 1 letter + 7 digits) |
| `front` | file | optional. JPEG, PNG or WebP, ≤ 5 MB. The type is decided from the file's bytes |
| `back` | file | optional, same rules. Ignored and removed for `PAN` |

```bash
curl -X PUT localhost:4000/api/v1/customers/C-0009/kyc -H "Authorization: Bearer $TOKEN" \
  -F type=AADHAAR -F 'number=4321 7890 5612' -F front=@front.jpg -F back=@back.jpg
```

`200` → customer. Adds the proof, or replaces the customer's proof of the same `type`; other
types are left alone, so a customer can hold, say, Aadhaar and PAN together. A photo replaces only
the side sent. The ID type and number alone count as "proof on file" for approval; photos are not
required.
Errors: `400 ID_FORMAT`, `400 NOT_AN_IMAGE`, `413 FILE_TOO_LARGE`.

### `DELETE /customers/{id}/kyc/{type}`

Removes that proof and deletes its photos. `200` → customer. `404` when the customer holds no
proof of that type.

### `GET /customers/{id}/kyc/{type}/{side}`

`type` is the ID type, `side` is `front` or `back`. `200` → the image bytes with its content type, `Cache-Control: no-store`.
The route needs the `Authorization` header, so a browser cannot load it as a bare `<img src>`;
fetch it and use a blob URL. `404` when there is no proof of that type or that side has no photo.

## Applications

### `POST /loans/price`

Prices a loan for the form preview. Saves nothing.

```json
{ "type": "PRE", "principal": 50000, "annualRatePct": 18, "months": 10, "fee": 1000 }
```

| Field | Rules |
|---|---|
| `type` | required: `POST` \| `PRE` |
| `principal` | 1,000 – 1,000,000 |
| `annualRatePct` | > 0 and ≤ 60, up to 3 decimals |
| `months` | 1 – 60 |
| `fee` | ≥ 0 and at most a tenth of `principal` |

<a id="terms"></a>`200` → Terms:

```json
{ "totalInterest": 7500, "totalPayable": 50000, "emi": 5000, "netDisbursal": 41500 }
```

Interest is flat: `totalInterest = principal × annualRatePct × months / 1200`, rounded half-up.

| | `POST` | `PRE` |
|---|---|---|
| `totalPayable` (what the installments recover) | principal + interest | principal |
| `netDisbursal` (cash handed over) | principal − fee | principal − interest − fee |
| `emi` | `totalPayable / months`, rounded **up** to the rupee | same |

Errors: `400 FEE_HIGH`, `400 NOTHING_TO_DISBURSE` (PRE interest and fee leave nothing to hand over).

<a id="application"></a>Application object:

```json
{
  "id": "APP-3107",
  "customerId": "C-0009",
  "customerName": "Meena Gopal",
  "lineId": "L04",
  "type": "POST",
  "principal": 35000,
  "annualRatePct": 24.000,
  "months": 10,
  "fee": 500,
  "emi": 4200,
  "disburseOn": "2026-10-11",
  "submittedOn": "2026-10-11",
  "submittedBy": "Vetrivel S",
  "status": "pending",
  "note": null,
  "decidedOn": null,
  "loanId": null,
  "approvalBlocker": "noProof",
  "terms": { "totalInterest": 7000, "totalPayable": 42000, "emi": 4200, "netDisbursal": 34500 }
}
```

`submittedBy` is the name of the customer's line officer at submission, not necessarily the
caller. `approvalBlocker` is `"noProof"` while the customer has no identity proof, else null.
`note` holds the approval note or the rejection reason. `loanId` is set once disbursed.

### `GET /applications` · `GET /applications/{id}`

Query, both optional: `status`, `customerId`.

### `POST /applications`

The [price](#post-loansprice) fields plus:

| Field | Rules |
|---|---|
| `customerId` | required, a customer code |
| `emi` | optional. Omit or null to accept the calculated one. May be rounded up, never down: `emi × months` must cover `totalPayable` |
| `disburseOn` | required date, at most 7 days ahead (back-dating is allowed) |

`201` → application, `pending`. The application takes the customer's current line.
Errors: `409 APPLICATION_OPEN` (the customer already has a pending or approved one),
`400 DATE_TOO_FAR`, `400 EMI_SHORT`, `400 FEE_HIGH`, `400 NOTHING_TO_DISBURSE`, `404` (customer).

### `POST /applications/{id}/approve` — manager

Body optional: `{ "note": "…" }` (≤ 500). `200` → application, `approved`; the customer moves
from `pending` to `approved`. Errors: `409 NOT_PENDING`, `409 NO_PROOF`.

### `POST /applications/{id}/reject` — manager

Body `{ "reason": "…" }`, required, ≤ 500. `200` → application, `rejected`. Errors: `409 NOT_PENDING`.

### `POST /applications/{id}/disburse` — manager

No body. Books the approved application as a loan **dated today** (not `disburseOn`), writes its
whole installment schedule, marks the application `disbursed` and the customer `active`.
`200` → [LoanDetail](#loan-detail). Errors: `409 NOT_APPROVED`.

## Loans

### `GET /loans`

| Query | Default | Values |
|---|---|---|
| `query` | – | matches loan number, customer name or phone |
| `state` | `all` | `all` \| `active` \| `overdue` \| `closed` |
| `lineId` | `all` | `all` or a line code |
| `customerId` | – | a customer code |
| `sort` | `newest` | `newest` (disbursal date) \| `late` (days late) \| `outstanding` |

`200` → array of `{ loan, summary }`:

```json
{
  "loan": {
    "id": "LN-20112", "customerId": "C-0004", "customerName": "Arulraj Devadoss", "customerPhone": "9884320176",
    "lineId": "L04", "lineName": "Line 04 · Velachery", "type": "PRE", "principal": 50000,
    "annualRatePct": 18.000, "months": 10, "fee": 1000, "emi": 5000, "disbursedOn": "2026-06-01"
  },
  "summary": {
    "totalInterest": 7500, "totalPayable": 50000, "netDisbursal": 41500,
    "paid": 15000, "outstanding": 35000,
    "next": { "seq": 4, "dueOn": "2026-10-01", "amount": 5000, "balanceAfter": 30000, "status": "overdue", "daysLate": 10, "paidOn": null },
    "state": "overdue", "daysLate": 10, "overdueAmount": 5000,
    "installmentsPaid": 3, "installmentsTotal": 10
  }
}
```

`summary` is derived on every read. `next` is the first unpaid installment (null when closed);
`daysLate` is how late that one is; `overdueAmount` sums every installment past its due date.

<a id="loan-detail"></a>
### `GET /loans/{id}`

`200` → LoanDetail: `{ loan, customer, summary, schedule, repayments }`.

```json
{
  "loan": { "id": "LN-20455", "…": "as above" },
  "customer": { "…": "full Customer object" },
  "summary": { "…": "as above" },
  "schedule": [
    { "seq": 1, "dueOn": "2026-09-11", "amount": 2600, "balanceAfter": 28400, "status": "paid", "daysLate": 0, "paidOn": "2026-09-11" },
    { "seq": 2, "dueOn": "2026-10-11", "amount": 2600, "balanceAfter": 25800, "status": "paid", "daysLate": 0, "paidOn": "2026-10-11" }
  ],
  "repayments": [
    { "receiptNo": "RC-20455-02", "seq": 2, "paidOn": "2026-10-11", "amount": 2600, "daysLate": 0, "mode": "CASH",
      "postedAt": "2026-10-11T06:00:00Z", "geo": null }
  ]
}
```

`schedule` is in `seq` order; `repayments` newest first. Installments fall due monthly from the
disbursal date. The last one takes whatever remains, so it can be smaller than the EMI.

## Collection

### `GET /collection/sheet`

Query: `lineId` (optional). For each open loan: the installments collected today, plus the next
one if it is due or overdue. Only the first unpaid installment of a loan is ever offered.

```json
[
  { "id": "LN-20455-2", "customer": "Lakshmi Priya", "customerId": "C-0005", "loanNo": "LN-20455", "seq": 2,
    "lineId": "L01", "amount": 2600, "dueOn": "2026-10-11", "daysLate": 0, "status": "collected" },
  { "id": "LN-20112-4", "customer": "Arulraj Devadoss", "customerId": "C-0004", "loanNo": "LN-20112", "seq": 4,
    "lineId": "L04", "amount": 5000, "dueOn": "2026-10-01", "daysLate": 10, "status": "overdue" }
]
```

`id` is `<loanNo>-<seq>`. To collect a row, post to `/loans/{loanNo}/payments` with its `seq`.

### `POST /loans/{id}/payments`

Receipts one installment in full.

```json
{
  "seq": 4,
  "paidOn": "2026-10-11",
  "mode": "CASH",
  "geo": { "lat": 13.0418, "lng": 80.2341, "accuracy": 12 },
  "clientOpId": "0b9f3c1e-6c1a-4d0e-9f43-2a1f6f6b7c11"
}
```

| Field | Rules |
|---|---|
| `seq` | required, ≥ 1. Must be the loan's first unpaid installment |
| `paidOn` | required. Not in the future, not before the installment's due date |
| `mode` | required: `CASH` \| `UPI` |
| `geo` | optional `{ lat, lng, accuracy? }` — where the collector is standing |
| `clientOpId` | optional, ≤ 64. Idempotency key |

There is no amount: the receipt is always for the installment's full amount.

`201` → receipt:

```json
{ "receiptNo": "RC-20112-04", "seq": 4, "paidOn": "2026-10-11", "amount": 5000, "daysLate": 10, "mode": "CASH",
  "postedAt": "2026-10-11T06:15:00.891Z", "geo": { "lat": 13.0418, "lng": 80.2341 } }
```

Receipting the last installment closes the loan.

**Idempotency.** If `clientOpId` was already used in this company, the original receipt is
returned (still `201`) and nothing new is written. Generate one UUID per collection attempt on the
device and reuse it on every retry.

Errors: `409 LOAN_CLOSED`, `409 WRONG_INSTALLMENT` (already collected, or an earlier one must be
collected first), `400 DATE_AHEAD`, `400 DATE_BEFORE_DUE`, `404`.

### `POST /sync/payments`

Uploads receipts captured while offline: 1-200 items, each with a required `clientOpId`.

```json
{
  "items": [
    { "clientOpId": "0b9f3c1e-…", "loanId": "LN-20112", "payment": { "seq": 4, "paidOn": "2026-10-11", "mode": "CASH" } },
    { "clientOpId": "77aa0d52-…", "loanId": "LN-20455", "payment": { "seq": 9, "paidOn": "2026-10-11", "mode": "UPI" } }
  ]
}
```

Items are applied in the order sent, each in its own transaction, so one failure never blocks the
rest. The call answers `200` whenever the batch itself is well-formed; check each result:

```json
{
  "results": [
    { "clientOpId": "0b9f3c1e-…", "status": "DUPLICATE", "receipt": { "receiptNo": "RC-20112-04", "…": "…" }, "code": null, "error": null },
    { "clientOpId": "77aa0d52-…", "status": "REJECTED", "receipt": null, "code": "WRONG_INSTALLMENT",
      "error": "Installment 3 of LN-20455 must be collected first" }
  ]
}
```

| `status` | Meaning | Client should |
|---|---|---|
| `APPLIED` | Receipt created | drop the queued item |
| `DUPLICATE` | This `clientOpId` was applied earlier; `receipt` is the original | drop the queued item |
| `REJECTED` | Refused; `code` and `error` say why | surface it to the user; retrying unchanged will fail again |

Queue several installments of one loan in `seq` order, or the later ones are rejected.

## Dashboard and insights

### `GET /dashboard`

```json
{
  "kpis": [
    { "id": "outstanding", "value": 215405, "delta": null, "currency": true },
    { "id": "collected", "value": 4934, "delta": null, "currency": true },
    { "id": "overdue", "value": 12234, "delta": null, "currency": true },
    { "id": "loans", "value": 8, "delta": null, "currency": false }
  ],
  "collectionsWeek": [{ "date": "2026-10-05", "amount": 0 }, { "date": "2026-10-06", "amount": 0 }],
  "dailyTarget": 25000,
  "arrears": [
    { "bucket": "current", "tone": "good", "accounts": 5, "amount": 152511 },
    { "bucket": "overdue1to30", "tone": "warning", "accounts": 3, "amount": 62894 },
    { "bucket": "overdue30plus", "tone": "critical", "accounts": 0, "amount": 0 }
  ],
  "lines": [{ "…": "Line objects" }],
  "pendingApprovals": 2
}
```

`kpis[].delta` is set only for `collected`: the percent change against yesterday to one decimal
(`-12.5`), or null when nothing was collected yesterday.
`collectionsWeek` has seven days ending today. `arrears[].amount` is the outstanding on the loans
in that bucket, not just the overdue part.

### `GET /insights`

`{ efficiency, risk }`.

```json
{
  "efficiency": {
    "today": { "due": 31368, "collected": 4934, "efficiency": 0.157 },
    "byLine": [{ "lineId": "L02", "name": "Line 02 · Perambur", "officer": "Priya Dharshini", "due": 9550, "collected": 0, "efficiency": 0.0 }],
    "byOfficer": [{ "officer": "Priya Dharshini", "lines": 1, "due": 9550, "collected": 0, "efficiency": 0.0 }],
    "week": { "collected": 4934, "target": 175000, "efficiency": 0.028, "days": 7 },
    "onTimeRate": 0.648,
    "avgDaysLate": 1.98
  },
  "risk": {
    "loans": [{
      "loanId": "LN-19845", "customerId": "C-0008", "customer": "Vignesh Kumar", "lineId": "L01", "line": "Line 01 · T. Nagar",
      "outstanding": 12394, "overdueAmount": 4134, "daysLate": 15, "installmentsPaid": 9, "installmentsTotal": 12,
      "score": 54, "band": "medium", "factors": ["currentArrears", "lateHistory", "worsening"]
    }],
    "outstanding": 215405,
    "par1": 0.292,
    "par30": 0.0,
    "bands": { "low": { "loans": 6, "outstanding": 168011 }, "medium": { "loans": 2, "outstanding": 47394 }, "high": { "loans": 0, "outstanding": 0 } },
    "aging": [{ "…": "arrears buckets, as on the dashboard" }]
  }
}
```

Ratios are fractions (0-1), not percentages, and are not rounded by the server. `par1` / `par30`
are the share of outstanding on loans with any installment overdue / more than 30 days late.
The risk `score` is rule-based, 0-100: current arrears (40), share of installments paid late (25),
mean days late (15), worsening trend over the last three payments (10), share still outstanding
(10). `band` is `high` at ≥ 60, `medium` at ≥ 30, else `low`.

## Reports — manager

All six return JSON; there is no CSV or PDF export.

**Date range.** Where `from` / `to` are accepted they are `YYYY-MM-DD` and both optional: `to`
defaults to today, `from` to the first day of `to`'s month. Errors: `400 BAD_RANGE` (`from` after
`to`), `400 RANGE_TOO_LONG` (over one year).

Per-line reports list only lines that have at least one loan, in line-code order.

### `GET /reports/portfolio-summary`

```json
[{ "lineId": "L01", "line": "Line 01 · T. Nagar", "officer": "Saravanan M", "activeLoans": 2, "closedLoans": 0,
   "disbursed": 65000, "outstanding": 38194, "overdue": 4134 }]
```

### `GET /reports/collection-register`

Query: `from`, `to`, `lineId`.

```json
{
  "range": { "from": "2026-10-01", "to": "2026-10-11" },
  "receipts": [{ "receiptNo": "RC-20455-02", "paidOn": "2026-10-11", "loanNo": "LN-20455", "customer": "Lakshmi Priya",
                 "lineId": "L01", "officer": "Saravanan M", "seq": 2, "amount": 2600, "mode": "CASH", "daysLate": 0 }],
  "total": 4934, "cash": 4934, "upi": 0
}
```

### `GET /reports/overdue-ageing`

```json
[{
  "lineId": "L01", "line": "Line 01 · T. Nagar", "officer": "Saravanan M",
  "buckets": {
    "current": { "accounts": 1, "overdue": 0, "outstanding": 25800 },
    "1-30":    { "accounts": 1, "overdue": 4134, "outstanding": 12394 },
    "31-60":   { "accounts": 0, "overdue": 0, "outstanding": 0 },
    "61-90":   { "accounts": 0, "overdue": 0, "outstanding": 0 },
    "90+":     { "accounts": 0, "overdue": 0, "outstanding": 0 }
  }
}]
```

### `GET /reports/disbursement-register`

Query: `from`, `to`.

```json
{
  "range": { "from": "2026-01-01", "to": "2026-10-11" },
  "loans": [{ "loanNo": "LN-20455", "disbursedOn": "2026-08-11", "customer": "Lakshmi Priya", "lineId": "L01", "type": "POST",
              "principal": 25000, "fee": 500, "interestUpfront": 0, "netDisbursal": 24500,
              "applicationId": null, "submittedBy": null, "approvedOn": null, "note": null }],
  "principal": 290000, "netDisbursal": 258700
}
```

The application fields are null for loans that did not come from an application (the seeded ones).

### `GET /reports/line-performance`

Query: `from`, `to`. `due` is what fell due in the range and `collected` how much of that has come
in; `arrears` and `overdueAccounts` are as they stand today, whatever the range.

```json
[{ "lineId": "L01", "line": "Line 01 · T. Nagar", "officer": "Saravanan M", "due": 2600, "collected": 2600,
   "efficiency": 1.0, "arrears": 4134, "overdueAccounts": 1 }]
```

### `GET /reports/day-book`

Query: `from`, `to`. One row per day with movement; quiet days are left out. `closing` is the
running net across the range, starting from zero.

```json
[{ "date": "2026-10-11", "cashIn": 4934, "upiIn": 0, "disbursedOut": 0, "net": 4934, "closing": 4934 }]
```

## Audit — manager

### `GET /audit-logs`

The latest 200 entries, newest first. No filters.

```json
[{ "id": 1, "companyId": 1, "actorId": 2, "action": "SIGN_IN", "entity": "USER", "entityCode": "2", "detail": null,
   "createdAt": "2026-10-11T06:12:30.584Z" }]
```

`actorId` is a user id. The actions are listed in the [schema reference](DATABASE_SCHEMA.md#audit_logs).

## AI assistant

### `POST /ai/chat`

Also served at `/ai/chat` without the prefix (the path the web app calls). Needs a token either way.

```json
{
  "locale": "en",
  "messages": [{ "role": "user", "content": "Which line has the most overdue today?" }]
}
```

| Field | Rules |
|---|---|
| `locale` | optional: `en` (default) \| `ta` |
| `messages` | 1-40 items of `{ role: "user" \| "assistant", content }`, content ≤ 4,000 characters. Must start and end with a `user` message |

The server builds the portfolio snapshot the model sees from the caller's company; a `snapshot`
sent by the client is ignored. ID numbers are never included.

The response is `200 text/event-stream`. Each event is one `data:` line holding a JSON object:

```
data: {"type":"text","text":"Line 02 · Perambur has "}

data: {"type":"text","text":"the most overdue…"}

data: {"type":"done"}
```

The stream ends with either `{"type":"done"}` or `{"type":"error","message":"…"}`. Failures after
the stream opens — including a missing `ANTHROPIC_API_KEY` — arrive as an `error` event on a `200`
response, so read the last event rather than the status. Validation problems are ordinary JSON
errors: `400 VALIDATION_FAILED`, `400 BAD_CONVERSATION`.

```bash
curl -N localhost:4000/api/v1/ai/chat -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"messages":[{"role":"user","content":"Summarise today"}]}'
```

## Error code reference

| Code | Status | Raised by |
|---|---|---|
| `ALT_PHONE_SAME` | 400 | customer create / edit |
| `APPLICATION_OPEN` | 409 | submit application |
| `BAD_CONVERSATION` | 400 | AI chat |
| `BAD_CREDENTIALS` | 401 | sign-in |
| `BAD_RANGE` | 400 | reports |
| `BAD_REQUEST` | 400 | any — unreadable body or parameter |
| `DATE_AHEAD` | 400 | record payment |
| `DATE_BEFORE_DUE` | 400 | record payment |
| `DATE_TOO_FAR` | 400 | submit application |
| `EMAIL_TAKEN` | 409 | sign-up, create user |
| `EMI_SHORT` | 400 | submit application |
| `FEE_HIGH` | 400 | price, submit application |
| `FILE_TOO_LARGE` | 413 | KYC upload |
| `FORBIDDEN` | 403 | role checks, suspended sign-in |
| `ID_FORMAT` | 400 | KYC upload |
| `INTERNAL_ERROR` | 500 | any |
| `LINE_IN_USE` | 409 | customer edit |
| `LINE_NAME_TAKEN` | 409 | line create / edit |
| `LOAN_CLOSED` | 409 | record payment |
| `NO_PROOF` | 409 | approve |
| `NOT_AN_IMAGE` | 400 | KYC upload |
| `NOT_APPROVED` | 409 | disburse |
| `NOT_FOUND` | 404 | any lookup by id |
| `NOT_PENDING` | 409 | approve, reject |
| `NOTHING_TO_DISBURSE` | 400 | price, submit application |
| `OWN_ROLE`, `OWN_STATUS` | 400 | update user |
| `PHONE_TAKEN` | 409 | customer create / edit |
| `RANGE_TOO_LONG` | 400 | reports |
| `RESET_LINK_INVALID` | 400 | reset password |
| `SCHEDULE_REQUIRED` | 400 | line create / edit |
| `TOO_MANY_ATTEMPTS` | 429 | sign-in |
| `UNAUTHENTICATED` | 401 | any protected route |
| `UNKNOWN_LINE` | 400 | customer create / edit |
| `UNKNOWN_OFFICER` | 400 | line create / edit |
| `VALIDATION_FAILED` | 400 | any body with field rules |
| `WRONG_INSTALLMENT` | 409 | record payment |
| `WRONG_PASSWORD` | 400 | change password |

## Postman collection

| File | |
|---|---|
| [`postman/microfin-lms.postman_collection.json`](postman/microfin-lms.postman_collection.json) | 49 requests in 12 folders, one per endpoint, with descriptions and example bodies |
| [`postman/microfin-lms.local.postman_environment.json`](postman/microfin-lms.local.postman_environment.json) | `baseUrl`, `email`, `password` for a local run |

**In Postman.** Import both files, pick the *Microfin LMS · local* environment, start the API with
the `dev` profile, and send **Auth → Sign in**. Its test script stores the token in the `token`
collection variable; the collection's bearer auth sends it on every other request.

**As a flow.** The folders run top to bottom as one scenario — create a line and a customer, save
KYC, submit → approve → disburse an application, collect an installment from today's sheet, replay
it through sync, then read every report. Requests save the ids they create (`lineId`,
`customerId`, `applicationId`, `loanId`, `payLoanId`, …) for the ones after them.

```bash
npx newman run docs/postman/microfin-lms.postman_collection.json \
  -e docs/postman/microfin-lms.local.postman_environment.json
```

Things to know before running it against a database you care about:

- It **writes**: a new company, a staff user, a line, a customer, an application, a loan, one
  receipt, and it rejects demo application `APP-3104`. Point it at a dev database.
- **Record payment** needs an uncollected row on today's sheet. On a fresh demo seed there are
  several; once all are collected it fails until another installment falls due.
- **Reject application** accepts `409` so the flow stays green on a second run.
- **Get KYC photo** accepts `404`, because the flow saves the ID number without a photo. Tick the
  `front` file field in **Save identity proof** to try an upload.
- **Chat (SSE)** answers `200` with an `error` event unless `ANTHROPIC_API_KEY` is set.
- The `today` variable is computed for `Asia/Kolkata`. Change the collection pre-request script if
  the server runs with a different `LMS_ZONE`.
- To see role enforcement, set `email` to `saravanan@demo.lms`: manager-only requests answer `403`.
