# GRENKE Leasing API — Integration Plan for Leazr

> **Status:** Planning. No code written yet. This doc is the reference for the
> implementation phases described at the bottom.

## 1. Source material

| File | What it contains |
|------|------------------|
| `swagger.json` | OpenAPI 2.0 spec — 28 endpoints, 40 type definitions. Source of truth for payloads. |
| `certificate.pdf` | mTLS enrollment flow (CSR → portal upload → signed cert) |
| `csr-openssl.pdf` | OpenSSL commands for generating a CSR on macOS/Linux (we need this — `certificate.pdf` is Windows/PowerShell only) |
| `postman_setup_guide.pdf` | Where the **API hostnames** are documented |
| `user-manual.pdf` | ⚠️ Only 1 page — re-download needed (or it really is just a stub) |
| `PHP-Code-Example.zip` | Reference connection code |

Portal: <https://developer.grenkeonline.com> · Login `api@itakecare.be`
Support: `service.api@grenke-group.com`

## 2. API at a glance

### Hosts

| Env | Host | Base path |
|-----|------|-----------|
| **Production** | `https://api.grenkeonline.com` | `/basic/v1/...` (or `/distributor/v1/...`) |
| **UAT (Test)** | `https://uatapi.grenkeonline.com` | idem |
| AT (acceptance) | `https://atapi.grenkeonline.com` | idem |
| INT (Grenke internal) | `https://intapi.grenkeonline.com` | not for us |

### Authentication

**mTLS only.** Every single request must carry an X.509 client certificate
issued by `GRENKE Public Leasing API CA`. No bearer token, no API key.

Trust chain (server side, must be installed in our outgoing-call runtime):
- `GRENKE Public Root CA`
- `GRENKE Public Leasing API CA`
Both downloadable from <http://pki.grenkeonline.com>.

Enrollment flow (one-time per environment, must be repeated for prod separately):
1. Generate keypair + CSR locally (use `csr-openssl.pdf` — OpenSSL recipe for macOS).
2. Paste CSR into developer portal → **Certificates → Request certificate**.
3. Download the signed `.cer` from the portal.
4. Combine `private.key` + `signed.cer` → `.pfx` (PKCS#12) — or keep PEM pair.
5. Store in Supabase Vault, mount in the edge function.

⚠️ The "Create CSR" link the doc references **isn't visible in the current
portal navigation** (we only see Homepage / Documentation / List of certificates
/ FAQ / Logout). We may need to ask Grenke support — or the link appears only
once at least one CSR has been uploaded. Worst case the developer-portal API
endpoint is `POST /Certificates` with the CSR text in the body.

### Two namespaces — pick one

| Namespace | Meaning | When to use |
|-----------|---------|-------------|
| `/basic/v1` | Reseller acts in **its own name** (iTakecare submits its own dossiers) | ✅ default for Leazr-iTakecare |
| `/distributor/v1` | Reseller acts **on behalf of a business partner** | Only if Leazr starts onboarding other resellers under iTakecare's umbrella |

Day-1 we go `basic`. The `distributor` variant is identical in shape with one
extra `InTheNameOfBusinessPartnerInput` body parameter, so the abstraction
should be ready to flip.

### The 5 endpoints that matter for V1

| # | Verb + path | Purpose |
|---|-------------|---------|
| 1 | `GET  /echo` | Smoke test — returns datetime, proves mTLS works. |
| 2 | `POST /basic/v1/calculate` | Get monthly instalment for an amount/duration. Returns a list of `{Period, MonthlyTotalInstalment, FinancingAmount}`. |
| 3 | `POST /basic/v1/requests` | Submit a financing request. Returns `FinancingId` (UUID) + initial `State`. |
| 4 | `GET  /basic/v1/requests/{financingId}` | Poll status (`RequestToGrenke`, `MissingInfo`, `ApplicationReceived`, `Declined`, `Contracted`, …). |
| 5 | `POST /basic/v1/requests/{financingId}/contractdocument` | Generate the contract PDF once approved. |

Useful supporting calls:
- `GET /basic/v1/legalforms` — enum of `LegalFormId` (cache locally)
- `GET /basic/v1/objecttypes` — enum of `ObjectTypeId` (cache locally)
- `GET /basic/v1/customslas` — SLA list (cache locally)
- `POST /basic/v1/calculationSets/{financingId}/documents/base64` — upload supporting docs (KBIS, ID…) as base64
- `POST /basic/v1/requests/{financingId}/e-signature` — start e-signature (alternative to Yousign)
- `PATCH /basic/v1/requests/{financingId}` / `.../lessee` / `.../supplier` — fix a submitted request

## 3. Key payload shapes

### POST /basic/v1/calculate — body

```json
{
  "FinancingAmount": 2525.00,
  "Period": 36,
  "PaymentFrequency": "Monthly",        // or "Quarterly"
  "PaymentMethod": "Invoice",            // or "DirectDebit"
  "Currency": "EUR",
  "ProductType": "ClassicLease",         // or PartialAmortisation, Rent, AllIn, AllInWithoutBackup, AllIn6, AllIn3, OfficeDirect
  "RecurringService": 0.00,
  "HasRepurchase": false,
  "Commission": 0
}
```

Response (truncated):
```json
{
  "Items": [
    { "Period": 12, "MonthlyTotalInstalment": 220.0, "FinancingAmount": 2525.0, "Currency": "EUR", ... },
    { "Period": 24, "MonthlyTotalInstalment": 130.0, ... },
    { "Period": 36, "MonthlyTotalInstalment":  95.0, ... }
  ]
}
```

### POST /basic/v1/requests — body (the big one)

```json
{
  "FinancingAmount": 37000.0,
  "Period": 24,
  "PaymentFrequency": "Quarterly",
  "PaymentMethod": "Invoice",
  "Currency": "EUR",
  "RecurringService": 0.0,
  "ResidualValue": 0.0,
  "ProductType": "ClassicLease",
  "HasRepurchase": false,
  "Lessee": {
    "CompanyName": "Acme SPRL",
    "ExternalId": "BE0123456789",      // SIRET/BCE/VAT depending on country
    "LegalFormId": 2,                   // from /legalforms
    "FoundationDate": "1955-06-13T00:00:00",
    "Email": "contact@acme.be",
    "Telephones": [{ "Number": "+3221234567", "Type": "Phone" }],
    "Addresses": [{
      "Line1": "Rue de la Loi 16", "PostCode": "1000",
      "City": "Bruxelles", "Country": "BE", "Type": "Main"
    }]
  },
  "FinancingObjects": [{
    "Quantity": 10,
    "ObjectTypeId": 1,                  // from /objecttypes
    "Manufacturer": "DELL",
    "NetPricePerObject": 3700.0,
    "Name": "Latitude 5450",
    "SerialNumber": "...",
    "Details": "..."
  }]
}
```

Constraints (validation will return 400 with details):
- `FinancingAmount` must equal `Σ Quantity × NetPricePerObject` over `FinancingObjects`.
- `Lessee.Addresses` must contain exactly one with `Type: "Main"`.
- `LegalFormId` and `ObjectTypeId` must come from the reference endpoints.
- Italy only: `Lessee.ThirdPartyIdentifiers` mandatory (`CodiceUnivoco`, `PEC`).

### GET /basic/v1/requests/{financingId} — response (status)

`State` enum (this is what we'll map to Leazr's contract workflow):

| Grenke State | Meaning | Leazr mapping (proposal) |
|--------------|---------|--------------------------|
| `RequestToGrenke` | Submitted, in queue | `submitted_to_leaser` |
| `MissingInfo` | Grenke needs more docs | `info_requested` |
| `ApplicationReceived` | Under review | `under_review` |
| `GuaranteeRequired` | Need guarantee | `guarantee_required` |
| `ReadyToSign` | Approved, ready for contract | `approved` |
| `ContractPrinted` / `ContractPrintedBeforeStatement` | Paper contract sent | `contract_sent` |
| `AwaitingCustomerSignature` / `AwaitingPartnerSignature` / `AwaitingSigningAppSignature` / `StartingESignature` | Waiting for signature | `awaiting_signature` |
| `AwaitingDeliveryConfirmation` | Need delivery PV | `awaiting_delivery` |
| `Contracted` | ✅ Final — contract live | `active` (creates Leazr contract) |
| `Declined` | ❌ Refused | `rejected` |
| `Cancelled` | Withdrawn | `cancelled` |
| `CancellingESignature` | E-sig being cancelled | (transient — log only) |
| `None` | Empty / unknown | (treat as `submitted_to_leaser`) |

⚠️ **No webhook documented.** Status retrieval is pull-only via `GET /requests/{financingId}`.
We need a polling cron (e.g. every 30 min) for offers in non-terminal Grenke states.

## 4. How this fits Leazr's existing model

### What's already in place (from codebase exploration)

- `leasers` table with Grenke (UUID `d60b86d7-a129-4a17-a877-e8e5caa66949`)
  containing duration coefficients.
- `offers.leaser_id` and `contracts.leaser_id` foreign keys.
- Offer → Contract automatic conversion in
  `src/services/offers/offerStatus.ts` (`createContractFromOffer`).
- Edge-function pattern for outbound integrations:
  `supabase/functions/adios-proxy/` (good template).

### What we need to add

**DB migration (`supabase/migrations/<ts>_grenke_api.sql`):**

```sql
-- Track Grenke-side submission on the offer
alter table public.offers
  add column grenke_financing_id     uuid,
  add column grenke_request_id       text,           -- functional ID Grenke gives back
  add column grenke_state            text,           -- raw enum from Grenke
  add column grenke_submitted_at     timestamptz,
  add column grenke_state_updated_at timestamptz,
  add column grenke_last_error       jsonb;          -- last 4xx/5xx for ops

create index offers_grenke_state_idx
  on public.offers(grenke_state)
  where grenke_state is not null
    and grenke_state not in ('Contracted','Declined','Cancelled');

-- Per-tenant Grenke creds (we're multi-tenant). One row per company.
create table public.leaser_credentials (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies(id) on delete cascade,
  leaser_id       uuid not null references public.leasers(id),
  environment     text not null check (environment in ('uat','production')),
  -- Cert material lives in Supabase Vault, we only store the secret name here
  vault_secret_name text not null,        -- e.g. "grenke_uat_itakecare_pfx"
  vault_passphrase_secret_name text,
  status          text not null default 'pending' check (status in ('pending','active','revoked')),
  enrolled_at     timestamptz,
  expires_at      timestamptz,
  created_at      timestamptz not null default now(),
  unique (company_id, leaser_id, environment)
);

-- Cache of Grenke reference data so the UI doesn't hit Grenke for every dropdown
create table public.grenke_reference_data (
  company_id  uuid not null,
  kind        text not null check (kind in ('legalforms','objecttypes','customslas')),
  payload     jsonb not null,
  fetched_at  timestamptz not null default now(),
  primary key (company_id, kind)
);
```

**Edge function `supabase/functions/grenke-api/index.ts`:**

Single proxy following the `adios-proxy` convention. Action-dispatched:

| Action | Calls | When |
|--------|-------|------|
| `echo` | `GET /echo` | Health check / cert validation |
| `calculate` | `POST /basic/v1/calculate` | UI: live-recompute monthly amount |
| `submit_offer` | `POST /basic/v1/requests` | When Leazr offer reaches `validated` and `leaser_id = grenke` |
| `get_status` | `GET /basic/v1/requests/{id}` | Cron poller + manual refresh button |
| `get_contract_doc` | `POST /basic/v1/requests/{id}/contractdocument` then `GET …/contractdocument` | When Grenke state goes `ReadyToSign` |
| `upload_document` | `POST /basic/v1/calculationSets/{id}/documents/base64` | Upload KBIS/ID supporting docs |
| `refresh_reference_data` | `GET /basic/v1/legalforms`, `/objecttypes`, `/customslas` | Daily cron + on demand |

mTLS in Deno: we use `Deno.createHttpClient({ caCerts, cert, key })` then pass
to `fetch(url, { client })`. Cert + key are read from Supabase Vault.

**Cron poller `supabase/functions/grenke-status-poller/index.ts`:**
- Schedule: every 30 minutes via Supabase scheduled functions.
- Query: `SELECT id, grenke_financing_id FROM offers WHERE grenke_state IS NOT NULL AND grenke_state NOT IN ('Contracted','Declined','Cancelled') LIMIT 200`.
- For each: invoke `grenke-api` with action `get_status`, update `grenke_state` and `grenke_state_updated_at`.
- On `Contracted` → trigger existing `createContractFromOffer` pipeline.

**UI surfaces:**
1. In offer financing config: "Submit to Grenke" button (only when `leaser_id = Grenke`).
2. Offer detail page: badge showing current `grenke_state` + "Refresh" button.
3. Settings → Integrations → Grenke: cert enrollment status (pending / active / expires-on), cert expiry warning ≥30 days, "Switch UAT / Prod" toggle.

## 5. Implementation phases

| Phase | Scope | Deliverable | Estimated effort |
|-------|-------|-------------|------------------|
| **0 — Cert enrollment (UAT)** | Generate CSR with OpenSSL on macOS, upload to portal, get signed `.cer`, build `.pfx`, store in Supabase Vault. | Working cert in vault. `GET /echo` returns 200 from a manual curl. | 0.5 day (mostly Grenke roundtrip) |
| **1 — Edge function skeleton** | `supabase/functions/grenke-api/` with `echo` action only. Vault secret read, mTLS in Deno verified. | Calling `supabase functions invoke grenke-api '{"action":"echo"}'` returns Grenke datetime. | 1 day |
| **2 — Calculate endpoint** | Add `calculate` action. Hook UI: replace local coefficient calc with API call **only** when `leaser_id = Grenke` AND credentials are active (fallback to current local table otherwise). | "Calculer avec Grenke" button on offer screen returns live numbers. | 1 day |
| **3 — Submit + poll** | DB migration, `submit_offer` + `get_status` actions, cron poller, status mapping. | Submitting an offer creates a `grenke_financing_id`, poller transitions state, terminal `Contracted` triggers contract creation. | 2 days |
| **4 — Contract docs + e-sign** | `get_contract_doc`, `upload_document` actions. Decide: keep Yousign or use Grenke e-signature for Grenke contracts? | Generated PDF stored, doc upload working. | 1.5 days |
| **5 — Reference-data cache + UI polish** | Daily refresh cron, dropdowns wired to cached `legalforms`/`objecttypes`. Grenke integration page in Settings. | Onboarding a new tenant takes <10 min once they have a cert. | 1 day |
| **6 — Production cert + cutover** | Repeat phase 0 against `https://api.grenkeonline.com`, feature flag `grenke_production_enabled`. | iTakecare submits real dossiers via API. | 0.5 day |

**Total: ~7.5 dev-days**, gated by Grenke's cert turnaround time at phase 0 and 6.

## 6. Decisions (locked)

| # | Question | Answer |
|---|----------|--------|
| 1 | Markets | **BE / FR / LU** (all EUR). Need per-country `LegalFormId` mapping and `ExternalId` validation: BCE (BE: `BE\d{10}`), SIRET (FR: `\d{14}`), RCS Lux (LU). |
| 2 | Product type | **`ClassicLease` only.** No need to expose other product types in the UI. |
| 3 | E-signature | **Use Grenke's e-signature endpoint** (`POST /basic/v1/requests/{id}/e-signature`) — Grenke runs DocuSign behind it. We **do not** use Yousign for Grenke contracts. Yousign is kept for self-leasing / non-Grenke flows. |
| 4 | Multi-tenant | **Yes from V1.** Every Leazr tenant can plug their own Grenke account. The `leaser_credentials` table + Settings UI for cert enrollment ship with phase 1, not later. |

## 7. Still to confirm (won't block phase 0)

- **Cert storage** — confirm Supabase Vault (default plan). Otherwise self-hosted KMS.
- **Polling cadence** — proposing 30 min, with manual "Refresh" button on offer page.
- **Backfill** — strictly going-forward, or backfill in-flight Grenke offers once live?
- **Payment defaults** — letting Grenke branch profile decide (don't send `PaymentFrequency`/`PaymentMethod` unless overridden in UI).

## 8. Country-specific notes (BE / FR / LU)

### Lessee identifiers (`Lessee.ExternalId`)

| Country | Format | Example | Validation regex |
|---------|--------|---------|------------------|
| BE | BCE / KBO | `BE0123456789` | `^BE\d{10}$` |
| FR | SIRET | `12345678901234` | `^\d{14}$` |
| LU | RCS Luxembourg | `B123456` (numeric, sometimes with prefix) | `^B?\d{4,8}$` |

### Legal forms (`Lessee.LegalFormId`)

We **must not** hardcode IDs — they come from `GET /basic/v1/legalforms`. Cache
per-tenant in `grenke_reference_data`. The form list is filtered by Grenke
based on the cert's branch (BE branch returns BE forms, etc.). Implication:
**one cert per country** if iTakecare wants to submit dossiers in all three —
or a single cert with a multi-country profile (to confirm with Grenke support).

### `Address.Country` codes

ISO 3166-1 alpha-2: `BE`, `FR`, `LU`. Required field on every address.

## 9. Multi-tenant credential storage

Decision #4 means we ship the per-tenant cert flow on day 1.

```
Settings > Integrations > Grenke
├── Status: ⚪ Not configured / 🟡 Pending CSR / 🟢 Active (expires in 287d)
├── [Generate CSR]   ← runs OpenSSL in an edge function, returns the .csr text
├── Upload signed cert (.cer from Grenke portal)
├── Set passphrase  ← stored in Vault, never displayed again
└── [Test connection]   ← calls grenke-api action=echo
```

The `leaser_credentials` table holds:
- `vault_secret_name` → Supabase Vault key for the `.pfx` blob
- `vault_passphrase_secret_name` → Vault key for the passphrase
- `expires_at` → cron alerts at T-30d

## 10. Decisions journal

| Date | Decision | Why |
|------|----------|-----|
| 2026-05-09 | mTLS via Supabase Vault, not env vars | Vault rotates cleanly; env vars expose to all functions in the project |
| 2026-05-09 | `/basic/v1` namespace, not `/distributor/v1` | iTakecare submits in its own name |
| 2026-05-09 | Polling, not webhook (none documented) | Confirmed in Swagger; will revisit if Grenke ships webhooks |
| 2026-05-09 | DocuSign via Grenke `/e-signature`, no Yousign for Grenke contracts | Per user — keeps the legal envelope inside Grenke's flow |
| 2026-05-09 | Multi-tenant from V1 | Per user — `leaser_credentials` ships with phase 1 |
