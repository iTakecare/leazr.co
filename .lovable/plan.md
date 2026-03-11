

# Diagnostic : synchronisation des factures de vente Billit

## Probleme identifie

Les logs de l'Edge Function `billit-import-invoices` montrent :
- 120 factures recuperees depuis Billit
- **240 factures deja importees** dans la base (avec `external_invoice_id`)
- **104 factures Leazr sans lien Billit** (candidates a la reconciliation)
- **0 importee, 0 reconciliee** = rien ne se passe

Le probleme est que les 120 factures Billit sont toutes **deja presentes** dans la base (importees lors d'un import precedent), donc elles sont **skippees avant** d'atteindre la logique de reconciliation. Les 104 factures Leazr orphelines ne sont jamais matchees.

De plus, il y a probablement des doublons : les memes factures existent a la fois comme imports Billit (avec `external_invoice_id`) ET comme factures Leazr natives (sans `external_invoice_id`), sans lien entre elles.

## Plan de correction

### 1. Nettoyer les doublons existants

Creer une migration SQL qui :
- Pour chaque facture importee Billit qui a un doublon Leazr (meme montant ±2%, meme nom client), transferer le `external_invoice_id` et `billing_data` vers la facture Leazr et supprimer le doublon Billit
- Cela resoudra les 240 imports redondants

### 2. Modifier la logique de reconciliation dans `billit-import-invoices`

Le probleme actuel : la reconciliation ne se fait que pour les factures Billit **nouvelles** (pas encore importees). Il faut ajouter une etape supplementaire :

- Apres le skip des factures deja importees, parcourir les factures Billit deja importees mais **sans contract_id ni offer_id** 
- Pour celles-ci, tenter de les reconcilier avec des factures Leazr sans `external_invoice_id`
- Si match trouve : transferer les donnees Billit vers la facture Leazr et supprimer le doublon

### Fichiers impactes

| Fichier | Action |
|---|---|
| `supabase/functions/billit-import-invoices/index.ts` | Modifier — ajouter reconciliation des factures deja importees |
| Migration SQL | Creer — nettoyage initial des doublons existants |

