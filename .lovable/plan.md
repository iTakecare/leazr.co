

# Plan : Corriger les 152 offres sans numero de dossier et les 57 offres avec mauvais coefficient

## Probleme constate

1. **Numeros de dossier manquants** : 152 offres ont `dossier_number IS NULL`. La migration precedente ne ciblait que les types `web_request` / `custom_pack_request`, mais la majorite des offres sont de type `client_request`.

2. **Mauvais coefficient** : 57 offres ont un coefficient de 3.53 alors que leur montant finance reel (mensualite x 100 / coefficient) depasse 2500€, ce qui les place dans la tranche 3.24. Cela cause une marge affichee incorrecte (39.7% au lieu de 52.2%).

## Correction

### Migration SQL unique qui :

1. **Genere les numeros de dossier** pour les 152 offres sans `dossier_number` (tous types confondus, pas seulement `web_request`)

2. **Recalcule le coefficient** pour les offres dont le montant finance reel tombe dans une tranche differente de celle stockee :
   - Pour chaque offre avec coefficient 3.53 : si `(monthly_payment * 100 / 3.24) > 2500` → mettre coefficient a 3.24
   - Mettre a jour `amount` (montant finance) = `monthly_payment * 100 / nouveau_coefficient`

3. **Recalcule les marges des equipements** associes a ces offres corrigees :
   - Pour chaque ligne d'equipement : `selling_price` = `monthly_payment * 100 / nouveau_coefficient` (redistribue proportionnellement)
   - `margin` = `(selling_price - purchase_price) / purchase_price * 100`

### Fichiers impactes

| Fichier | Action |
|---|---|
| Migration SQL | Creer — correction des 152 dossier_number + recalcul des 57 offres avec mauvais coefficient et leurs equipements |

