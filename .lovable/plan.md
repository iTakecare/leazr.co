
# Actions de Swap et Recuperation de materiel dans le detail contrat

## Vue d'ensemble

Ajouter deux fonctionnalites directement dans la page de detail d'un contrat :
1. **Swap** : remplacer un equipement defaillant par un article disponible en stock
2. **Recuperation fin de contrat** : remettre le materiel en stock, le vendre au client, ou le mettre au rebut

Ces actions seront regroupees dans une nouvelle carte "Gestion du stock" placee dans la colonne principale du detail contrat, apres la section "Suivi des achats".

---

## Nouveaux composants

### 1. `src/components/stock/ContractStockManager.tsx`

Carte principale qui :
- Charge les `stock_items` attribues au contrat (`current_contract_id = contractId`) via `fetchStockItems`
- Affiche la liste des articles de stock lies au contrat (titre, numero de serie, etat)
- Propose un bouton **"Swap"** sur chaque article assigne (ouvre le `SwapDialog`)
- Propose les boutons de **fin de contrat** (Remettre en stock / Vendre / Rebuter) sur chaque article assigne
- Si aucun article de stock n'est lie, affiche un message explicatif

Props : `contractId`, `companyId`, `onUpdate`

### 2. `src/components/stock/SwapDialog.tsx`

Dialog de swap qui :
- Recoit l'article defaillant (`currentItem: StockItem`) et le `contractId`
- Charge les articles disponibles en stock (`status = 'in_stock'` pour la meme `company_id`)
- Permet de selectionner un article de remplacement dans une liste filtrable (par titre/serial)
- Champ texte pour la raison du swap (obligatoire)
- Bouton de confirmation qui appelle `performSwap()` du `stockService`
- Affiche un toast de succes et rafraichit la liste

### 3. `src/components/stock/EndOfContractActions.tsx`

Composant qui affiche 3 boutons d'action pour un article assigne :
- **Remettre en stock** : ouvre un dialog pour choisir la condition (neuf, comme neuf, bon etat, etc.), puis met a jour le `stock_item` en `in_stock` avec `current_contract_id = null` et cree un mouvement `unassign_contract`
- **Vendre au client** : met a jour le statut en `sold` et cree un mouvement `sell`
- **Mettre au rebut** : met a jour le statut en `scrapped` et cree un mouvement `scrap`

Chaque action demande confirmation via un AlertDialog.

---

## Modifications au service stock (`stockService.ts`)

Ajouter 3 nouvelles fonctions composites :

### `fetchStockItemsByContract(contractId: string)`
Requete filtree sur `current_contract_id = contractId` pour charger uniquement les articles de stock lies a ce contrat.

### `recoverToStock(companyId, itemId, condition, userId)`
- Met a jour le stock_item : `status = 'in_stock'`, `condition = condition`, `current_contract_id = null`, `current_contract_equipment_id = null`
- Cree un mouvement `unassign_contract`

### `sellItem(companyId, itemId, userId)` et `scrapItem(companyId, itemId, userId)`
- Mettent a jour le statut en `sold` / `scrapped` et creent les mouvements correspondants

---

## Integration dans ContractDetail.tsx

- Importer `ContractStockManager`
- Ajouter la carte dans la colonne principale, apres `ContractPurchaseTracking` :

```text
<ContractStockManager 
  contractId={contract.id}
  companyId={companyId}
  onUpdate={refetch}
/>
```

La carte ne sera visible que si `companyId` est disponible (multi-tenant).

---

## Aucune modification de base de donnees

Les tables `stock_items`, `stock_movements` et `stock_repairs` existent deja avec tous les champs et statuts necessaires. Les fonctions `performSwap`, `updateStockItem`, `createMovement` et `createRepair` sont deja implementees dans `stockService.ts`.

---

## Resume des fichiers

| Fichier | Action |
|---|---|
| `src/components/stock/ContractStockManager.tsx` | Creer - carte principale |
| `src/components/stock/SwapDialog.tsx` | Creer - dialog de swap |
| `src/components/stock/EndOfContractActions.tsx` | Creer - boutons recuperation/vente/rebut |
| `src/services/stockService.ts` | Modifier - ajouter `fetchStockItemsByContract`, `recoverToStock`, `sellItem`, `scrapItem` |
| `src/pages/ContractDetail.tsx` | Modifier - integrer `ContractStockManager` |
