# GRENKE API integration — current state

> Companion to [INTEGRATION.md](./INTEGRATION.md). This file tracks what is
> deployed and where things live RIGHT NOW. Re-read before any maintenance.
>
> Last refreshed: **2026-05-30**.

## 1. TL;DR

| Layer | Status | Note |
|-------|--------|------|
| DB schema (offers cols + `grenke_reference_data` + RPCs) | ✅ Live in prod | Migration `20260509170000_grenke_api_phase1.sql` |
| Edge function `grenke-api` | ✅ Deployed | Routes through the VPS mTLS proxy |
| Settings UI card (cert paste + Test connection) | ✅ Live | `src/components/settings/GrenkeIntegrationCard.tsx` |
| Production client certificate | ✅ Issued, in Vault + on VPS | Valid 2026-05-30 → 2028-05-29 |
| `GET /echo` end-to-end | ✅ Confirmed | "Connexion Production OK" toast |
| `POST /basic/v1/calculate` | 🟡 **Blocked at Grenke side** | Returns 500 "No condition list found" — Grenke business config pending |
| `POST /basic/v1/requests` (submit) | ⏳ Not started | Phase 3 |
| UAT environment | ❌ Not set up | Only Production was provisioned |
| Status polling cron | ⏳ Not started | Phase 3 |
| Admin UI for offer submission | ⏳ Not started | Phase 3-4 |

## 2. Architecture

```
┌────────────────────┐
│  Leazr web client  │
└─────────┬──────────┘
          │  supabase.functions.invoke('grenke-api', {action, environment, payload})
          ▼
┌─────────────────────────────────────────────────┐
│  Supabase Edge Function grenke-api              │
│  (eu-central-1, Deno 2.1.4)                     │
│  - Resolves user → company_id via profiles       │
│  - Reads cert presence (Vault)                  │
│  - Adds X-Proxy-Secret header                   │
└─────────┬───────────────────────────────────────┘
          │  HTTPS (Let's Encrypt cert)
          │  POST https://grenke-proxy.itakecare.be/...
          │  Header: X-Proxy-Secret: <32-byte hex>
          ▼
┌─────────────────────────────────────────────────┐
│  iTakecare VPS — srv1302946 / 76.13.0.189      │
│  Traefik (routes by Docker labels)              │
│       ↓                                         │
│  nginx-alpine "grenke-proxy" container          │
│  /opt/grenke-proxy/                             │
│  - Verifies X-Proxy-Secret                      │
│  - Strips that header before forwarding         │
│  - Forces HTTP/1.1                              │
│  - mTLS via OpenSSL (TLS 1.2 + renegotiation)   │
└─────────┬───────────────────────────────────────┘
          │  HTTPS + client cert presented
          │  during TLS renegotiation
          ▼
┌─────────────────────────────────────────────────┐
│  GRENKE Leasing API                             │
│  api.grenkeonline.com (217.25.134.43)           │
│  IIS / ASP.NET                                  │
└─────────────────────────────────────────────────┘
```

### Why the proxy

GRENKE's API requires the client cert via **TLS renegotiation** (server sends
`Hello request` + `Request CERT` AFTER the HTTP request is sent — visible in
the curl trace). rustls — the TLS library behind Deno's `fetch` — refuses to
support renegotiation by policy. OpenSSL (nginx, curl) handles it fine.

Confirmed by curl trace 2026-05-30 against `api.grenkeonline.com:443`.

## 3. File / asset inventory

### On developer laptop (Mac)

| Path | Mode | What |
|------|------|------|
| `docs/grenke-api/swagger.json` | gitignored | OpenAPI 2.0 spec (proprietary) |
| `docs/grenke-api/*.pdf` | gitignored | Grenke proprietary docs |
| `docs/grenke-api/INTEGRATION.md` | tracked | Design rationale + 7-phase plan |
| `docs/grenke-api/STATE.md` | tracked | This file |
| `docs/grenke-api/certs/.gitignore` | tracked | Excludes everything in `certs/` |
| `docs/grenke-api/certs/production/leasingapi-production.key` | 600 | Private key (PEM) — DO NOT SHARE |
| `docs/grenke-api/certs/production/leasingapi-production.csr` | 644 | The CSR we uploaded |
| `docs/grenke-api/certs/production/leasingapi-production.cer` | 644 | Original DER from Grenke portal |
| `docs/grenke-api/certs/production/leasingapi-production.pem` | 644 | Same cert in PEM format |
| `docs/grenke-api/certs/production/leasingapi.conf` | 644 | OpenSSL config that produced the CSR |

### On VPS (`itcmdm-vps` / `root@76.13.0.189`)

| Path | Mode | What |
|------|------|------|
| `/opt/grenke-proxy/conf/nginx.conf` | 644 root:root | Nginx config (incl. `GRENKE_PROXY_SECRET` in plaintext) |
| `/opt/grenke-proxy/certs/cert.pem` | 644 root:root | Same cert as local `.pem` |
| `/opt/grenke-proxy/certs/key.pem` | **600 root:root** | Same private key as local `.key` |
| `/opt/grenke-proxy/logs/grenke.access.log` | nginx | Access logs |
| `/opt/grenke-proxy/logs/grenke.error.log` | nginx | Errors (look here when debugging) |
| `/opt/grenke-proxy/docker-compose.yml` | 644 | Compose stack |

### In Supabase

| Where | Key | What |
|-------|-----|------|
| `vault.secrets` (decrypted view) | `grenke_production_cert_<companyId>` | Same cert PEM, stored per tenant |
| `vault.secrets` (decrypted view) | `grenke_production_key_<companyId>` | Same key PEM, stored per tenant |
| Edge function env vars | `GRENKE_PROXY_SECRET` | 32-byte hex shared secret with nginx |
| Edge function env vars | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` | Auto-provided |
| `public.company_integrations` | `integration_type='grenke'` | Per-company config (env enable flags, vault secret names) |
| `public.offers` (cols) | `grenke_financing_id`, `grenke_request_id`, `grenke_state`, `grenke_environment`, `grenke_submitted_at`, `grenke_state_updated_at`, `grenke_last_error` | Track submission lifecycle |
| `public.grenke_reference_data` | (company_id, env, kind) | Cache for `/legalforms`, `/objecttypes`, `/customslas` |

### DNS (OVH)

| Domain | Type | Target |
|--------|------|--------|
| `grenke-proxy.itakecare.be` | A | `76.13.0.189` |

TLS cert auto-issued by Traefik via Let's Encrypt (HTTP-01).

## 4. Secrets inventory (locations only — never log values)

| Secret | Where it lives | Source of truth |
|--------|----------------|-----------------|
| GRENKE client cert (PEM) | Vault + VPS bind-mount | Generated by Grenke PKI 2026-05-30 |
| GRENKE client private key (PEM) | Vault + VPS bind-mount (600) + dev laptop (600) | Generated locally with OpenSSL 2026-05-30 |
| GRENKE_PROXY_SECRET (32-byte hex) | Supabase function env + nginx.conf | `openssl rand -hex 32` 2026-05-30 |
| Supabase service role key | Supabase project settings | Provisioned automatically |
| GitHub Actions deploy key | GitHub repo secrets | iTakecare org admin |
| SSH key `~/.ssh/id_itcmdm` | Dev laptop | Existing key, root on VPS |

⚠️ **The cert.pem + key.pem live in 3 places** (laptop, VPS, Vault). When the
cert expires (2028-05-29) or is revoked, **rotate in all three** — see Runbook
§7.1.

## 5. Identifiers (you'll need these for support emails)

| Identifier | Value |
|------------|-------|
| Developer Portal login | `api@itakecare.be` |
| Developer Portal user ID | `3fa0436d-d51a-432f-b8e3-6f63beb0e01b` |
| Client cert CN (Production) | `1bd336de-3052-4258-8f2a-ccbb95d42f02` |
| Client cert OU | `Production` |
| Client cert validity | `2026-05-30 → 2028-05-29` (2 years) |
| Client cert SHA-256 fingerprint | `F0:1E:7B:03:70:D3:36:5F:62:25:D6:8B:0A:3B:90:0D:58:84:94:26:F5:4E:5F:A2:9B:05:C9:D8:DD:F4:F7:35` |
| Issuer | `CN=GRENKE Public Leasing API CA, DC=grenkeleasing, DC=com` |
| API hosts | `api.grenkeonline.com` (prod), `uatapi.grenkeonline.com` (UAT, not provisioned) |
| Supabase project ID | `cifbetjefyfocafanlhv` |
| Supabase region | `eu-central-1` (functions) |

## 6. Contacts

| Person / channel | Role | When to reach out |
|------------------|------|-------------------|
| Marius Westenhoff (`mwestenhoff@grenke.de`) | Digital Sales Reseller Journey — GRENKE digital GmbH | Cert issuance, portal access, technical questions |
| `service.api@grenke-group.com` | GRENKE API team | Anything technical / cert problems / condition list setup |
| iTakecare local branch (`api@itakecare.be` is the dev account; main commercial contact is via the local Belgian GRENKE branch) | Business setup (conditions, products allowed, etc.) | Pricing tables, product types enabled, market activation |
| GitHub repo | `iTakecare/leazr.co` (main branch deploys to prod via Actions) | All code |

## 7. Runbook (common ops)

### 7.1 Rotate the client certificate

When the cert nears expiry (2028-Q2) or is compromised:

1. Generate a fresh keypair + CSR with OpenSSL:
   ```bash
   cd docs/grenke-api/certs/production
   cp leasingapi.conf leasingapi-rotated.conf  # edit CN to the new one Grenke gives
   openssl genrsa -out leasingapi-rotated.key 4096
   openssl req -config leasingapi-rotated.conf -new -sha256 \
     -key leasingapi-rotated.key -out leasingapi-rotated.csr
   ```
2. Paste the CSR into the Grenke Developer Portal → Certificates → Request certificate.
3. Download the signed `.cer`, convert to PEM:
   ```bash
   openssl x509 -inform DER -in <new>.cer -outform PEM -out leasingapi-rotated.pem
   ```
4. Verify cert ↔ key match (md5 of modulus must equal).
5. Update **Vault** via the Settings UI (Settings → Intégrations → Grenke → Production → paste new cert + key → Save).
6. Update **VPS** via `scp`:
   ```bash
   scp leasingapi-rotated.pem itcmdm-vps:/opt/grenke-proxy/certs/cert.pem
   scp leasingapi-rotated.key itcmdm-vps:/opt/grenke-proxy/certs/key.pem
   ssh itcmdm-vps "chmod 644 /opt/grenke-proxy/certs/cert.pem &&
                   chmod 600 /opt/grenke-proxy/certs/key.pem"
   ```
7. Reload the proxy: `ssh itcmdm-vps "docker exec grenke-proxy nginx -s reload"`
8. Smoke test `/echo`.
9. Revoke the old cert via the Grenke Developer Portal.

### 7.2 Rotate the `GRENKE_PROXY_SECRET`

If suspected leak:
1. Generate new secret: `openssl rand -hex 32`
2. Update nginx.conf on VPS — replace value in the `if ($http_x_proxy_secret != "...")` line.
3. `ssh itcmdm-vps "docker exec grenke-proxy nginx -s reload"`
4. Update Supabase: `supabase secrets set GRENKE_PROXY_SECRET=<new>`
5. Redeploy the function: `supabase functions deploy grenke-api`

### 7.3 Look at the proxy logs

```bash
ssh itcmdm-vps "tail -f /opt/grenke-proxy/logs/grenke.access.log"
ssh itcmdm-vps "tail -f /opt/grenke-proxy/logs/grenke.error.log"
ssh itcmdm-vps "docker logs --tail 100 -f grenke-proxy"
```

### 7.4 Look at the edge function logs

<https://supabase.com/dashboard/project/cifbetjefyfocafanlhv/functions/grenke-api/logs>

Each request prints:
- `[grenke-api] POST request received` (entry)
- `[grenke-api] grenkeFetch via proxy → <method> <url>` (right before fetch)

### 7.5 Restart the proxy

```bash
ssh itcmdm-vps "cd /opt/grenke-proxy && docker compose restart"
```

### 7.6 Restart Traefik (the global reverse proxy) — only if needed

```bash
ssh itcmdm-vps "docker restart deploy-traefik-1"
```

⚠️ This affects ALL the apps on the VPS (leazrapp, transferlease, winbroker, etc.). Don't do this casually.

## 8. Outstanding blockers

### 🟡 Grenke "condition list" not provisioned

`POST /basic/v1/calculate` (and presumably `/requests`) returns:

```json
{
  "Message": "There is a problem with this User Account. Please contact your GRENKE representative.",
  "StatusCode": 500,
  "Details": "No condition list found for the submitted parameters",
  "CorrelationId": "GRENKE-LeasingAPI-...+e36b5063-8ba7-412f-a197-2c0e65e3f664"
}
```

Tested all 5 product types × 2 frequencies × 2 methods = 20 combos. **Same
error every time.** Conclusion: certificate / authentication is fine
(otherwise we'd get 401), but Grenke hasn't yet set up the pricing /
product / market grid for this account.

**Action**: mail to Marius (text drafted in chat 2026-05-30) requesting
condition list setup for BE / FR / LU markets, ClassicLease.

**Once unblocked**, edge function code is already in place — no work needed
on our side beyond a smoke test.

### ⚠️ Vault extension on first DB push

The migration `20260509170000_grenke_api_phase1.sql` does
`create extension if not exists "supabase_vault"`. If Vault isn't already
enabled in the Supabase project, this fails silently with a permission
error. Workaround: enable manually in Database → Extensions → `supabase_vault`.
(Already done for iTakecare prod.)

### 📅 Calendar reminder: cert renewal

- Cert expires `2028-05-29`.
- Set a calendar reminder for `2028-03-01` (90 days ahead) to start the
  rotation flow in §7.1.

## 9. Decisions journal

| Date | Decision | Why |
|------|----------|-----|
| 2026-05-09 | mTLS via Supabase Vault, not env vars | Vault rotates cleanly; env vars expose to all functions in the project |
| 2026-05-09 | `/basic/v1` namespace, not `/distributor/v1` | iTakecare submits in its own name |
| 2026-05-09 | Polling, not webhook (none documented) | Confirmed in Swagger; will revisit if Grenke ships webhooks |
| 2026-05-09 | DocuSign via Grenke `/e-signature`, no Yousign for Grenke contracts | Per user — keeps the legal envelope inside Grenke's flow |
| 2026-05-09 | Multi-tenant from V1 | Per user — `leaser_credentials` ships with phase 1 |
| 2026-05-30 | Markets: BE / FR / LU only, EUR | Per user |
| 2026-05-30 | Product type: ClassicLease only | Per user |
| 2026-05-30 | Subject for CSR follows the `.ps1` script Grenke generates (`/CN=<UUID>/OU=Production`, no `O`/`C`) | Match exactly what Grenke's PKI expects |
| 2026-05-30 | Production cert first (no UAT) | UAT is a separate provisioning step; Grenke FAQ acknowledges there's no real sandbox |
| 2026-05-30 | Force HTTP/1.1 outbound (no HTTP/2) | Server returns `HTTP_1_1_REQUIRED` on h2 streams |
| 2026-05-30 | Add an nginx mTLS proxy on the VPS | Deno/rustls in Supabase Edge can't do TLS renegotiation, which Grenke's server uses for post-handshake client cert auth |
| 2026-05-30 | Reuse Traefik for the proxy's public TLS (`grenke-proxy.itakecare.be`) | Existing infra, free LE auto-renew, no new processes |
| 2026-05-30 | Single proxy container, multi-tenant via vault names later | YAGNI — 1 tenant today (iTakecare), refactor when a 2nd shows up |
