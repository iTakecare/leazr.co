# Security Hardening Deployment

This repository contains a priority hardening patch for critical Supabase Edge Functions.

## Prerequisites

- Supabase CLI installed and authenticated.
- Project access to `cifbetjefyfocafanlhv`.
- A strong secret for scheduled endpoint protection.
- If you don't have Docker available, keep `SUPABASE_USE_API=true` (default) to deploy via the Supabase API.

## 1) Set environment variables

```bash
export SUPABASE_PROJECT_REF="cifbetjefyfocafanlhv"
export UPDATE_EXTENDED_CONTRACTS_SECRET="$(openssl rand -hex 32)"
export ALLOW_CREATE_TEST_USERS="false"
export SUPABASE_USE_API="true"
```

## 2) Deploy migrations + functions

```bash
./scripts/deploy-security-hardening.sh
```

If `supabase db push` fails because migration history is desynchronized, deploy hardened functions first:

```bash
SKIP_DB_PUSH=true ./scripts/deploy-security-hardening.sh
```

## 3) Run security smoke tests

Set required values:

```bash
export SUPABASE_PROJECT_URL="https://cifbetjefyfocafanlhv.supabase.co"
export ADMIN_JWT="<admin-or-super-admin-jwt>"
export VALID_SIGNATURE_TOKEN="<signed-contract-signature-token>"
export VALID_UPLOAD_OFFER_ID="<offer-id-with-valid-upload-token>"
export VALID_UPLOAD_TOKEN="<valid-upload-token>"
export CRON_SECRET="${UPDATE_EXTENDED_CONTRACTS_SECRET}"
```

Run:

```bash
./scripts/security-smoke-tests.sh
```

## Notes

- `create-test-users` is now blocked by default. Keep `ALLOW_CREATE_TEST_USERS=false` in production.
- `update-extended-contracts` now supports:
  - privileged JWT (`super_admin` / `service_role`), or
  - `x-cron-secret` header matching `UPDATE_EXTENDED_CONTRACTS_SECRET`.
- Public workflows remain supported through validated tokens:
  - `send-signed-contract-email` with `signatureToken`.
  - `notify-documents-uploaded` with `uploadToken`.
