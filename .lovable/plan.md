

# Export Excel des commandes fournisseurs

## Plan

### 1. Créer `src/services/equipmentOrderExportService.ts`
Service d'export Excel utilisant ExcelJS (déjà installé), suivant le même pattern que `stockExportService.ts` et `offersExportService.ts`.

**Colonnes** : Source, N° Contrat, Client, Équipement, Quantité, Fournisseur, Prix HTVA unitaire, Prix HTVA total, TVA, Prix TVAC, Statut, Réf. commande, Date commande, Date réception, Notes.

Le service prendra en entrée les `items` et `suppliers` déjà chargés (pas de re-fetch), calculera la TVA (21% belge / 0% EU) et générera le fichier.

### 2. Modifier `src/pages/admin/EquipmentOrders.tsx`
- Ajouter un bouton "Exporter" avec l'icône `Download` dans le header (à côté du titre "Commandes fournisseurs")
- Le bouton exporte **toutes** les commandes (`items`), pas seulement les filtrées
- Import et appel du service d'export

