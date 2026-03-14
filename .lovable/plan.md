

## Diagnostic

L'erreur est dans les logs Edge Function :
```
new row for relation "offers" violates check constraint "check_offer_type"
```

La contrainte `check_offer_type` sur la table `offers` autorise ces types :
`ambassador_offer`, `offer`, `client_request`, `internal_offer`, `admin_offer`, `web_request`, `custom_pack_request`, `purchase_request`, `self_leasing`

Le type `partner_request` n'est pas dans la liste. Le client se crée car il est inséré avant l'offre, mais l'offre échoue à cause de cette contrainte.

## Correction

**1 seule migration SQL** : modifier la contrainte CHECK pour ajouter `partner_request` aux types autorisés.

```sql
ALTER TABLE offers DROP CONSTRAINT check_offer_type;
ALTER TABLE offers ADD CONSTRAINT check_offer_type 
  CHECK (type = ANY (ARRAY[
    'ambassador_offer', 'offer', 'client_request', 'internal_offer', 
    'admin_offer', 'web_request', 'custom_pack_request', 'purchase_request', 
    'self_leasing', 'partner_request'
  ]));
```

Aucun changement de code requis -- le Edge Function envoie déjà le bon type.

