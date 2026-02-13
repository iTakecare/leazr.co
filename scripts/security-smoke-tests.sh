#!/usr/bin/env bash
set -euo pipefail

# Security smoke tests for hardened Edge Functions.
#
# Required env vars:
#   SUPABASE_PROJECT_URL         e.g. https://<ref>.supabase.co
#   ADMIN_JWT                    JWT of an admin or super_admin user
#   VALID_SIGNATURE_TOKEN        Existing signed contract signature token
#   VALID_UPLOAD_OFFER_ID        Offer id tied to a valid upload token
#   VALID_UPLOAD_TOKEN           Valid token from offer_upload_links
#   CRON_SECRET                  Must match UPDATE_EXTENDED_CONTRACTS_SECRET
#
# Optional:
#   EXPECT_COMPANY_ID            UUID used for manual scenario validation

BASE_URL="${SUPABASE_PROJECT_URL:?SUPABASE_PROJECT_URL is required}/functions/v1"
ADMIN_JWT="${ADMIN_JWT:?ADMIN_JWT is required}"
VALID_SIGNATURE_TOKEN="${VALID_SIGNATURE_TOKEN:?VALID_SIGNATURE_TOKEN is required}"
VALID_UPLOAD_OFFER_ID="${VALID_UPLOAD_OFFER_ID:?VALID_UPLOAD_OFFER_ID is required}"
VALID_UPLOAD_TOKEN="${VALID_UPLOAD_TOKEN:?VALID_UPLOAD_TOKEN is required}"
CRON_SECRET="${CRON_SECRET:?CRON_SECRET is required}"

curl_json() {
  local method="$1"
  local url="$2"
  local body="${3:-}"
  shift 3 || true
  local extra_headers=("$@")

  local args=(-sS -o /tmp/smoke_body.txt -w "%{http_code}" -X "$method" "$url")
  if [[ -n "$body" ]]; then
    args+=(-H "Content-Type: application/json" --data "$body")
  fi
  for h in "${extra_headers[@]}"; do
    args+=(-H "$h")
  done

  curl "${args[@]}"
}

expect_status() {
  local got="$1"
  local expected="$2"
  local name="$3"
  if [[ "$got" != "$expected" ]]; then
    echo "FAIL: ${name} (expected ${expected}, got ${got})"
    echo "Body:"
    cat /tmp/smoke_body.txt
    exit 1
  fi
  echo "PASS: ${name} (${got})"
}

echo "Running security smoke tests against ${BASE_URL}"

# 1) Locked admin endpoint should reject anonymous
status="$(curl_json POST "${BASE_URL}/create-admin-user" '{"email":"x@y.z","password":"Temp123!","role":"admin"}')"
if [[ "$status" != "401" && "$status" != "403" ]]; then
  echo "FAIL: create-admin-user anonymous must be blocked (got ${status})"
  cat /tmp/smoke_body.txt
  exit 1
fi
echo "PASS: create-admin-user anonymous blocked (${status})"

# 2) Admin endpoint should accept authorized admin (may fail 400 on validation/business rule, which is acceptable for auth check)
status="$(curl_json POST "${BASE_URL}/get-all-users" "" "Authorization: Bearer ${ADMIN_JWT}")"
if [[ "$status" != "200" && "$status" != "400" ]]; then
  echo "FAIL: get-all-users with admin JWT should not be unauthorized (got ${status})"
  cat /tmp/smoke_body.txt
  exit 1
fi
echo "PASS: get-all-users accepts admin JWT (${status})"

# 3) Public signed-contract email path should work with signature token (no JWT)
status="$(curl_json POST "${BASE_URL}/send-signed-contract-email" "{\"signatureToken\":\"${VALID_SIGNATURE_TOKEN}\"}")"
if [[ "$status" != "200" && "$status" != "400" ]]; then
  echo "FAIL: send-signed-contract-email public token flow should be reachable (got ${status})"
  cat /tmp/smoke_body.txt
  exit 1
fi
echo "PASS: send-signed-contract-email public flow reachable (${status})"

# 4) Public notify-documents-uploaded must require valid uploadToken
status="$(curl_json POST "${BASE_URL}/notify-documents-uploaded" "{\"offerId\":\"${VALID_UPLOAD_OFFER_ID}\",\"uploadToken\":\"${VALID_UPLOAD_TOKEN}\"}")"
if [[ "$status" != "200" && "$status" != "400" ]]; then
  echo "FAIL: notify-documents-uploaded public token flow should be reachable (got ${status})"
  cat /tmp/smoke_body.txt
  exit 1
fi
echo "PASS: notify-documents-uploaded public flow reachable (${status})"

# 5) update-extended-contracts should accept cron secret without JWT
status="$(curl_json POST "${BASE_URL}/update-extended-contracts" "{}" "x-cron-secret: ${CRON_SECRET}")"
if [[ "$status" != "200" && "$status" != "204" ]]; then
  echo "FAIL: update-extended-contracts cron secret flow should be authorized (got ${status})"
  cat /tmp/smoke_body.txt
  exit 1
fi
echo "PASS: update-extended-contracts cron secret flow (${status})"

echo "Smoke tests completed."
