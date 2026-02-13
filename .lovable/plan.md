

# Gestion des commandes partielles (unite par unite)

## Probleme actuel

Aujourd'hui, une ligne d'equipement avec quantite=2 n'a qu'un seul fournisseur, un seul statut et un seul prix. Impossible de commander chaque unite separement.

## Solution : nouvelle table `equipment_order_units`

Creer une table enfant qui stocke une ligne par unite, chacune avec son propre fournisseur, prix, statut et reference de commande.

### Schema de la table

```text
equipment_order_units
+--------------------+----------+------------------------------------------+
| Colonne            | Type     | Description                              |
+--------------------+----------+------------------------------------------+
| id                 | uuid PK  | Identifiant unique                       |
| source_type        | text     | 'offer' ou 'contract'                    |
| source_equipment_id| uuid     | ID dans offer_equipment ou               |
|                    |          | contract_equipment                       |
| unit_index         | integer  | Numero de l'unite (1, 2, 3...)           |
| order_status       | text     | to_order / ordered / received / cancelled|
| supplier_id        | uuid FK  | Fournisseur pour cette unite             |
| supplier_price     | numeric  | Prix d'achat chez ce fournisseur         |
| order_date         | timestz  | Date de commande                         |
| order_reference    | text     | Reference de commande                    |
| reception_date     | timestz  | Date de reception                        |
| order_notes        | text     | Notes                                    |
| serial_number      | text     | Numero de serie (optionnel)              |
| created_at         | timestz  | Date de creation                         |
| updated_at         | timestz  | Date de mise a jour                      |
+--------------------+----------+------------------------------------------+
Contrainte unique : (source_type, source_equipment_id, unit_index)
```

### Logique de fonctionnement

1. **Initialisation** : Quand un equipement a quantite > 1, un bouton "Gerer par unite" cree N lignes dans `equipment_order_units` (une par unite).

2. **Mode simple vs detaille** :
   - Quantite = 1 : comportement actuel inchange (pas de sous-lignes)
   - Quantite > 1 sans sous-lignes : comportement actuel (un seul statut/fournisseur pour tout)
   - Quantite > 1 avec sous-lignes : chaque unite est geree individuellement

3. **Affichage** : Les equipements avec sous-lignes s'affichent en accordeon. La ligne principale montre un resume (ex: "1/2 recu"), et en deployant on voit chaque unite avec son propre Select de statut, fournisseur, prix.

## Modifications prevues

### 1. Migration SQL

- Creer la table `equipment_order_units`
- Ajouter les index et la contrainte unique
- Ajouter les politiques RLS (acces via company_id de l'offre/contrat parent)

### 2. Service (`src/services/equipmentOrderService.ts`)

- Ajouter les fonctions CRUD pour `equipment_order_units`
- `splitEquipmentIntoUnits(sourceType, equipmentId, quantity)` : cree les N lignes
- `fetchEquipmentUnits(sourceType, equipmentId)` : recupere les sous-lignes
- `updateEquipmentUnit(unitId, data)` : met a jour une unite
- Adapter `fetchAllEquipmentOrders` pour inclure les informations des sous-lignes

### 3. Page Commandes fournisseurs (`src/pages/admin/EquipmentOrders.tsx`)

- Pour les equipements avec sous-lignes : afficher une ligne resume (avec un chevron pour deployer)
- En deploye : afficher une sous-ligne par unite avec ses propres controles (statut, fournisseur, prix)
- Bouton "Gerer par unite" sur les lignes avec quantite > 1 qui n'ont pas encore de sous-lignes
- Adapter les totaux pour prendre en compte les prix individuels des unites

### 4. Carte Suivi des achats (`src/components/contracts/ContractPurchaseTracking.tsx`)

- Meme logique : ligne deployable pour les equipements avec sous-lignes
- Bouton "Gerer par unite" pour activer le mode detaille
- Chaque sous-unite a son propre statut, fournisseur, prix reel

### 5. Types (`src/types/offerEquipment.ts` et service)

- Ajouter l'interface `EquipmentOrderUnit`
- Enrichir `EquipmentOrderItem` avec un champ optionnel `units?: EquipmentOrderUnit[]`

## Details techniques

| Element | Detail |
|---------|--------|
| Nouvelle table | `equipment_order_units` avec RLS |
| Fichiers modifies | `equipmentOrderService.ts`, `EquipmentOrders.tsx`, `ContractPurchaseTracking.tsx`, `offerEquipment.ts` |
| Retrocompatibilite | Les equipements sans sous-lignes continuent de fonctionner comme avant |
| Declenchement | Manuel via bouton "Gerer par unite" (pas automatique) |

