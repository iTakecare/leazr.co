

## Mise à jour des numéros TVA manquants

### Constat
Les 4 clients importés récemment ont leur `vat_number` à `null` dans la base de données, alors que les valeurs existent dans le Google Sheet :

| Client | ID | N° TVA (Sheet) |
|--------|-------|----------------|
| Collard Yohan | `a50b8ab7-...` | 1054.887.654 → `BE1054887654` |
| Alexandre Josquin | `3c29a877-...` | 1015.248.619 → `BE1015248619` |
| Izmir Mehmeti | `8c12a894-...` | `BE0801690944` |
| Tiffany Vienne | `0e6a57e1-...` | `BE0733802129` |

### Action
Une migration SQL pour mettre à jour les 4 clients :

```sql
UPDATE clients SET vat_number = 'BE1054887654' WHERE id = 'a50b8ab7-da12-4425-a0d6-56dc9192b96c';
UPDATE clients SET vat_number = 'BE1015248619' WHERE id = '3c29a877-d1a1-4ba4-b787-de10eb26b195';
UPDATE clients SET vat_number = 'BE0801690944' WHERE id = '8c12a894-a5d4-449c-a195-5f13823c4d33';
UPDATE clients SET vat_number = 'BE0733802129' WHERE id = '0e6a57e1-29df-4b12-8be7-4c3003da0c0b';
```

Après migration, le numéro TVA apparaîtra directement dans la fiche client (en haut dans la section contact rapide et dans "Informations générales" > "ID entreprise").

### Fichier créé
- `supabase/migrations/20260315162100_backfill_vat_numbers.sql`

