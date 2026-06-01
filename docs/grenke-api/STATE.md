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
| `POST /basic/v1/calculate` | ✅ Working (BE only) | Confirmed 2026-05-30 — requires `ProductType=Rent` + `PaymentFrequency=Quarterly` for iTakecare's BE contract |
| `POST /basic/v1/requests` (submit) | ⏳ Not started | Phase 3 |
| UAT environment | ❌ Not set up | One Grenke API account = one env. To get UAT we have to ask Grenke to provision a **second**, separate API account (confirmed by Robin Quack 2026-05-26). |
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
| Robin Quack (`Digital Reseller Channel`, grenke AG, Baden-Baden) | Backup contact when Marius is away | Same as Marius — write to the original thread and CC if unsure |
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

### ✅ Resolved 2026-05-30 — `/calculate` works for BE / Rent / Quarterly

Initial calls returned 500 "No condition list found for the submitted
parameters". After mailing Marius:

- He confirmed iTakecare's BE account is provisioned for
  `ProductType="Rent"` (NOT ClassicLease, which is what we initially
  tried — based on the Swagger example).
- The API explicitly rejects `PaymentFrequency="Monthly"` for Rent with
  *"PaymentFrequency 'Monthly' is not available. Should be one of
  [Quarterly]"* — billing must be quarterly. The instalment field is
  still called `MonthlyTotalInstalment` (= monthly equivalent shown to
  the lessee) but Grenke collects every 3 months.

Confirmed working values returned for `FinancingAmount=15000.0`:

| Period | MonthlyTotalInstalment | Coefficient (monthly) |
|--------|------------------------|-----------------------|
| 18     | 936.00 €               | 6.24 %                |
| 24     | 688.50 €               | 4.59 %                |
| 36     | 472.50 €               | 3.15 %                |
| 48     | 361.50 €               | 2.41 %                |
| 60     | 295.50 €               | 1.97 %                |

The 3.15 % at 36 months matches the coefficient iTakecare was already
using locally — sanity check passes.

Defaults in `handleCalculate` updated accordingly (commit pending).

### 📌 Per-country certificate requirement

Per Marius 2026-05-30: **each country (BE / FR / LU) requires its own
client certificate**, because each is mapped to a different responsible
Grenke salesperson. Today we have **BE only** — for FR or LU we'd need
to:

1. Identify the Grenke contact for that country.
2. Get a new "Production" Developer Portal account (or a sub-account)
   provisioned for that country.
3. Generate a new CSR (different CN), upload via portal, retrieve cert.
4. Store under a country-aware Vault name (e.g. `grenke_production_be_cert_<companyId>`,
   `grenke_production_fr_cert_<companyId>`, …).
5. Extend the nginx proxy to route by country (e.g. `/be/...`, `/fr/...`)
   with a different `proxy_ssl_certificate` per location block, OR
   spin up one proxy container per country.

Today's edge function and UI are BE-only. Multi-country support is a
future refactor — keep it in mind when wiring `calculate` into the
offer flow so we can plug a country selector later.

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
| 2026-05-26 | Account `api@itakecare.be` upgraded from "Documentation" to "Production" | Robin Quack flipped the switch after our request mail. |
| 2026-05-26 | UAT not provisioned by default; would require a separate account | Per Robin Quack — explicitly noted so we don't waste time looking for a UAT toggle on our existing account. |
| 2026-05-30 | ProductType default = `Rent` (not ClassicLease) and PaymentFrequency = `Quarterly` (not Monthly) | Per Marius — iTakecare BE's account is only provisioned for this product/frequency combo. Other Grenke products on the menu (ClassicLease, AllIn, OfficeDirect…) would need separate contractual setup. |
| 2026-05-30 | One certificate per country (BE / FR / LU) — multi-country = multi-cert architecture | Per Marius — each country has its own responsible Grenke salesperson and therefore its own API account + cert. |
| 2026-05-30 | Keep the local coefficient matrix (no API live sync) | 99.9 % of iTakecare contracts are 36-month, and the matrix's 36-month row matches the API exactly across all 5 amount tranches. The 24 / 48 / 60-month rows drift by 0.1-0.3 pp vs the live API (and the 18-month column had bogus placeholder values 0/2/4/99 — fixed by hand). For the 0.1 % of non-36-month contracts that tolerance is acceptable. We'll revisit if Grenke's 36-month rate ever changes. |
