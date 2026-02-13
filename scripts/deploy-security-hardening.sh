#!/usr/bin/env bash
set -euo pipefail

# Deploys security hardening changes for Supabase functions + DB migration.
# Prerequisites:
# - supabase CLI installed and authenticated
# - project linked (or pass SUPABASE_PROJECT_REF)
# - UPDATE_EXTENDED_CONTRACTS_SECRET set
# - if your migration history is desynced, run with SKIP_DB_PUSH=true

PROJECT_REF="${SUPABASE_PROJECT_REF:-cifbetjefyfocafanlhv}"
CRON_SECRET="${UPDATE_EXTENDED_CONTRACTS_SECRET:-}"
ALLOW_TEST_USERS="${ALLOW_CREATE_TEST_USERS:-false}"
SKIP_DB_PUSH="${SKIP_DB_PUSH:-false}"
USE_API="${SUPABASE_USE_API:-true}"

USE_API_FLAG=()
if [[ "${USE_API}" == "true" ]]; then
  USE_API_FLAG=(--use-api)
fi

if ! command -v supabase >/dev/null 2>&1; then
  echo "Error: supabase CLI not found. Install it first: https://supabase.com/docs/guides/cli"
  exit 1
fi

if [[ -z "${CRON_SECRET}" ]]; then
  echo "Error: UPDATE_EXTENDED_CONTRACTS_SECRET is required."
  echo "Example:"
  echo "  export UPDATE_EXTENDED_CONTRACTS_SECRET=\"$(openssl rand -hex 32)\""
  exit 1
fi

echo "[1/4] Linking project ${PROJECT_REF}"
supabase link --project-ref "${PROJECT_REF}"

echo "[2/4] Setting secrets"
supabase secrets set \
  UPDATE_EXTENDED_CONTRACTS_SECRET="${CRON_SECRET}" \
  ALLOW_CREATE_TEST_USERS="${ALLOW_TEST_USERS}"

if [[ "${SKIP_DB_PUSH}" == "true" ]]; then
  echo "[3/4] Skipping DB migrations (SKIP_DB_PUSH=true)"
else
  echo "[3/4] Pushing DB migrations"
  supabase db push
fi

echo "[4/4] Deploying hardened edge functions"
for fn in \
  activate-prospect \
  billit-import-invoices \
  billit-sync-status \
  generate-auth-link \
  create-account-custom \
  create-product-request \
  create-prospect \
  custom-login \
  send-account-deleted-email \
  send-document-request \
  notify-documents-uploaded \
  send-leasing-acceptance-email \
  send-leasing-rejection-email \
  send-password-reset \
  send-contract-email \
  send-signed-contract-email \
  send-trial-welcome-email \
  update-extended-contracts \
  update-password-custom \
  create-admin-user \
  get-all-users \
  delete-user \
  update-user-email \
  update-user-password \
  create-company-with-admin \
  create-test-users \
  create-storage-bucket \
  create-site-settings-bucket \
  create-blog-bucket
do
  echo "  - Deploying ${fn}"
  supabase functions deploy "${fn}" "${USE_API_FLAG[@]}"
done

echo "Deployment completed."
