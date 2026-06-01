# Grenke deal-lifecycle automation — design & plan

> Vision (user, 2026-06-01): once a client is OK on iTakecare's side (score A),
> EVERYTHING downstream runs automatically — ID collection, Grenke submission,
> contract, signature, status tracking — so the team only has to order + ship
> the hardware. Then on delivery-confirmation signature, the invoice is
> auto-generated with the right amounts and sent to Grenke.

This is an orchestration across the whole deal lifecycle. It must run
**server-side** (cron / DB triggers) so it works without anyone having the app
open — that's the whole point of automation. The current pieces are mostly
client-side, so the keystone is a server-side **automation tick**.

## 1. The target pipeline

```
[Score A internally]
      │
      ▼
(A) ID-card collection
      ├── existing client → AI checks ID expiry
      │       ├── valid → proceed
      │       └── expired → email "votre carte est dépassée, merci de la renvoyer"
      └── new client → email "merci de fournir votre carte d'identité"
      │
      ▼  (all required docs validated)
(B) AUTO-SUBMIT to Grenke  ⚠️ real financial commitment
      │
      ▼  (poller, already built)
(C) Grenke decision tracking  ✅ done (cron poller)
      ├── Declined → leaser_rejected  ✅ done
      └── ReadyToSign
              │
              ▼
(D) AUTO send for DocuSign signature  (built as one-click; can go auto)
              │
              ▼  (poller)
(E) Contracted → auto-create Leazr contract  (built as one-click; full-auto deferred)
      │
      ▼
(F) Order + ship hardware  ← the ONLY manual step the user wants to keep
      │
      ▼
(G) Client signs delivery confirmation (bon de livraison)
      │   collect: delivery date, IBAN, ...
      ▼
(H) AUTO-generate invoice with correct amounts  ⚠️ real money
      │
      ▼
(I) Send invoice to Grenke
```

## 2. What already exists (building blocks)

| Block | Exists? | Where | Client/Server |
|-------|---------|-------|---------------|
| Score-A transition | ✅ but client-side only | `offerStatus.ts:101-104` | client — **needs server hook** |
| Document-request email | ✅ | `supabase/functions/send-document-request` | server (callable) |
| AI KYC analysis | ✅ (structured extraction) | `supabase/functions/analyze-client-kyc` | server — **ID-expiry extraction TBD** |
| Existing-client detection | ⚠️ trivial query, no helper | `contracts` where status active | either |
| Grenke submit | ✅ (manual one-click) | `grenke-api` submit_offer | server |
| Grenke status poller | ✅ (cron 30 min) | `grenke-api` poll_grenke_statuses | server |
| DocuSign e-signature | ✅ (one-click) | `grenke-api` start_esignature | server |
| Contract creation | ✅ but client-side | `contractService.createContractFromOffer` | client — **needs server port for full-auto** |
| Delivery confirmation signature | ❌ not built | — | — |
| Invoice generation | ⚠️ partial (purchase offers, Billit pull) | `invoiceService.ts` | mixed |
| Send invoice to leaser | ✅ (email) | `supabase/functions/send-leaser-documents` | server |
| IBAN collection + validation | ✅ (Mollie SEPA, client validator) | `mollie-sepa`, `ibanValidator.ts` | mixed |
| Email backbone | ✅ Resend + templates | `email_templates`, Resend | server |

## 3. The keystone — a server-side automation orchestrator

Automation can't depend on an admin having the offer open. We need a
server-side tick that walks each "in-flight" offer through the pipeline.

Proposed: extend the existing pg_cron + grenke-api pattern with an
`automation_tick` action (or a dedicated `grenke-automation` function) that:

1. Finds offers in an automatable state (score A, or grenke_state in a set).
2. For each, evaluates the next automated step and performs it (idempotently).
3. Writes an audit row per action (a new `offer_automation_log` table).

Each stage gated by a **per-company automation config** (a new
`grenke_automation_settings` row) so each automation can be:
`off` / `manual` (suggest only) / `auto` (act). This lets us ship in
suggest-mode and graduate to full-auto once validated — essential for the
real-money steps (B, H).

## 4. Risk gates (must stay behind explicit toggles)

| Step | Why risky | Default rollout |
|------|-----------|-----------------|
| (B) Auto-submit to Grenke | Creates a real financing dossier (commitment) | `manual` (suggest) → `auto` after pilot |
| (E) Auto-create contract unattended | Server-side contract creation not yet built; production-critical | one-click until server port validated |
| (H) Auto-generate + send invoice | Real money to the leaser; wrong amount = real problem | `manual` (review) → `auto` after pilot |

The low-risk, high-value steps (A ID collection, C tracking, D signature send,
status sync) can go `auto` early.

## 5. Gaps to build

1. **Server-side score-A hook**: a DB trigger on `offers` (workflow_status →
   leaser_approved/internal_approved) that enqueues automation, OR the cron
   tick scans for score-A offers. Cron scan is simpler + resilient.
2. **ID-expiry extraction**: extend `analyze-client-kyc` to pull the ID card
   expiry date into `ai_extraction`, + a check function.
3. **Existing-client helper**: `has_active_contract(client_id)`.
4. **Automation config + log tables**: `grenke_automation_settings`,
   `offer_automation_log`.
5. **Server-side contract creation** (for full-auto E): idempotent RPC port of
   createContractFromOffer.
6. **Delivery-confirmation signature flow** (G): a new signed "bon de
   livraison" capturing delivery date + IBAN. This is the biggest net-new UI.
7. **Invoice auto-generation for leasing** (H): compute the right amounts +
   generate + send to Grenke (mechanism: confirm whether Grenke wants the
   invoice via send-leaser-documents email, Peppol, or a Grenke API endpoint).

## 6. Proposed build order (incremental, each shippable + testable)

- **A1** — Automation config + log tables + the cron `automation_tick` skeleton.
- **A2** — Stage A: score-A → existing-client branch → ID collection email
  (auto, low risk). Reuses send-document-request.
- **A3** — ID-expiry AI check for existing clients.
- **A4** — Stage B: auto-submit to Grenke (behind `manual`/`auto` toggle).
- **A5** — Stage D: auto-send DocuSign when ReadyToSign + docs OK (toggle).
- **A6** — Stage E: server-side idempotent contract creation → full-auto.
- **A7** — Stage G: delivery-confirmation signature flow (net-new).
- **A8** — Stage H: leasing invoice auto-generation + send to Grenke (toggle).

## 6bis. Clarifications from the user (2026-06-01)

- **IBAN**: for a Grenke contract the CLIENT enters their IBAN inside DocuSign,
  NOT us. Whatever comes back is informational only. → no IBAN-collection UI to
  build for the Grenke path.
- **Signature order** (one DocuSign envelope): client signs the contract →
  iTakecare signs as supplier (fournisseur) → client signs the delivery
  confirmation (bon de livraison). Implemented: start_esignature sends
  CustomerContractSignees + PartnerContractSignees + CustomerDeliveryConfirmationSignees
  with UseDeliveryConfirmation=true.
- **Delivery date**: ⚠️ the reference is the EFFECTIVE delivery date entered in
  the Leazr contract, NOT the bon-de-livraison signature date (clients
  sometimes sign the delivery confirmation before actually receiving the goods).
  The invoice (step H) must use the contract's delivery_date.
- **Notifications**: the team wants to be informed of EVERY signature/lifecycle
  step. Implemented: the poller inserts an admin_notifications row on every
  grenke_state change (RequestToGrenke / ReadyToSign / AwaitingCustomerSignature
  / AwaitingPartnerSignature / AwaitingDeliveryConfirmation / Contracted / …).
- **Invoice → Grenke**: by email via the existing send-leaser-documents
  function.
- **Auto-submit appetite**: 1-click "confirmer la soumission", then everything
  else (signature send, status tracking, notifications, contract) chains
  automatically.

## 7. Open questions for the user

1. **Auto-submit (B)**: comfortable with the cron auto-submitting real dossiers
   once docs are validated, or keep a 1-click "confirmer la soumission" with
   auto-everything-else? (Recommend: start 1-click, flip to auto after pilot.)
2. **Invoice → Grenke (I)**: how does Grenke want the invoice today — by email
   (send-leaser-documents), Peppol, or is there a Grenke API endpoint? This
   decides step H/I.
3. **Delivery confirmation (G)**: is there an existing paper/PDF "bon de
   livraison" process to digitize, or do we design it from scratch? What fields
   must the client fill (delivery date, IBAN, signature)?
4. **Build order**: start at Stage A (ID collection) and move down, or
   prioritize a specific stage?
