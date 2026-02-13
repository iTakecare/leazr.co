

# Plan : Mise a jour des statuts + Accordeon par annee

## 1. Mise a jour en masse des statuts

Passer tous les equipements (contrats + offres acceptees) au statut "received" **sauf** ceux des 8 contrats suivants :

| Contrat | ID |
|---------|-----|
| CON-6ec7a293 | 6ec7a293-880d-42ae-8a53-968d6edb6637 |
| LOC-ITC-2026-02003 | 998d5bee-7fe1-4957-b4fe-fe514e127da0 |
| LOC-ITC-2026-02005 | 6aca4456-6547-4946-bfa4-93784c905faf |
| LOC-ITC-2026-02004 | c3e0ac85-33f4-4f13-85d7-72cf169f68f3 |
| CON-3bb47d1e | 3bb47d1e-b6bf-42e3-af6b-a7a5f7f11471 |
| 180-31458 | 752e4a02-ec92-474c-8562-300126ce1f99 |
| LOC-ITC-2026-01004 | 8f778adf-ea02-4d2f-837d-dbf4cb888787 |
| CON-a82d1ae5 | a82d1ae5-9a91-4a76-9896-7b11b1116c75 |

Cela concerne environ 280 equipements de contrats et 283 equipements d'offres acceptees a mettre a jour.

**Requetes SQL (via insert tool, pas migration) :**

```sql
-- Contract equipment : tout passer en received sauf les 8 contrats exclus
UPDATE contract_equipment
SET order_status = 'received', reception_date = NOW()
WHERE contract_id NOT IN (
  'a82d1ae5-9a91-4a76-9896-7b11b1116c75',
  '3bb47d1e-b6bf-42e3-af6b-a7a5f7f11471',
  '6ec7a293-880d-42ae-8a53-968d6edb6637',
  '8f778adf-ea02-4d2f-837d-dbf4cb888787',
  'c3e0ac85-33f4-4f13-85d7-72cf169f68f3',
  '6aca4456-6547-4946-bfa4-93784c905faf',
  '752e4a02-ec92-474c-8562-300126ce1f99',
  '998d5bee-7fe1-4957-b4fe-fe514e127da0'
)
AND (order_status IS NULL OR order_status != 'received');

-- Offer equipment : tout passer en received (offres acceptees uniquement)
UPDATE offer_equipment
SET order_status = 'received', reception_date = NOW()
WHERE offer_id IN (
  SELECT id FROM offers WHERE workflow_status = 'accepted'
)
AND (order_status IS NULL OR order_status != 'received');
```

## 2. Accordeon par annee dans la page Commandes fournisseurs

### Modification de `src/pages/admin/EquipmentOrders.tsx`

- Ajouter un champ `created_at` (ou `order_date`) dans les requetes de `fetchAllEquipmentOrders` pour connaitre l'annee
- Grouper les equipements filtres par annee (basee sur la date de creation du contrat/offre parent)
- Afficher chaque annee dans un `Accordion` avec le nombre d'items et le total
- Annee la plus recente ouverte par defaut
- Le reste du composant (filtres, cartes resume, statuts) reste inchange

### Modification de `src/services/equipmentOrderService.ts`

- Ajouter `created_at` dans les champs selectionnes depuis `offers` et `contracts`
- Ajouter un champ `source_date` dans `EquipmentOrderItem` pour permettre le groupement par annee

### Interface modifiee de `EquipmentOrderItem`

```typescript
export interface EquipmentOrderItem {
  // ... champs existants
  source_date?: string; // date de creation du contrat/offre pour groupement
}
```

### Fichiers concernes

| Fichier | Modification |
|---------|-------------|
| `src/services/equipmentOrderService.ts` | Ajouter `created_at` dans les selects + `source_date` dans le type |
| `src/pages/admin/EquipmentOrders.tsx` | Grouper par annee dans un Accordion, annee recente ouverte par defaut |

