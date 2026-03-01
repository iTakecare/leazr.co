
# Gestion de Stock Innovante

## Vue d'ensemble

Mise en place d'un systeme complet de gestion de stock pour suivre le cycle de vie de chaque equipement physique : de l'achat fournisseur jusqu'a la recuperation en fin de contrat, en passant par le swap/remplacement.

## Concept central : la table `stock_items`

Chaque unite physique (identifiee par un numero de serie) devient un **article de stock** avec un statut et un historique complet. C'est le coeur du systeme.

### Statuts d'un article de stock

```text
[commande] --> [en_stock] --> [attribue_contrat] --> [en_stock] (recuperation fin contrat)
                  |                  |                    |
                  |                  +--> [swap_sorti]    +--> [en_reparation] --> [en_stock]
                  |                                       |
                  +--> [vendu]                            +--> [mis_au_rebut]
```

- `ordered` : commande fournisseur, pas encore recu
- `in_stock` : en stock, disponible
- `assigned` : attribue a un contrat/client
- `in_repair` : en reparation (suite swap ou retour)
- `sold` : vendu (achat direct)
- `scrapped` : mis au rebut

## Nouvelles tables

### 1. `stock_items` -- article physique unique
| Colonne | Type | Description |
|---|---|---|
| id | uuid PK | |
| company_id | uuid FK | Entreprise |
| serial_number | text | Numero de serie |
| product_id | uuid FK nullable | Lien vers le catalogue |
| title | text | Description de l'article |
| status | text | ordered, in_stock, assigned, in_repair, sold, scrapped |
| condition | text | new, like_new, good, fair, defective |
| purchase_price | numeric | Prix d'achat reel |
| supplier_id | uuid FK nullable | Fournisseur d'origine |
| order_reference | text nullable | Reference commande fournisseur |
| purchase_date | date nullable | Date d'achat |
| reception_date | date nullable | Date de reception |
| current_contract_id | uuid FK nullable | Contrat actuel |
| current_contract_equipment_id | uuid FK nullable | Ligne equipement contrat |
| location | text nullable | Emplacement physique (bureau, entrepot...) |
| notes | text nullable | |
| created_at / updated_at | timestamptz | |

### 2. `stock_movements` -- historique des mouvements
| Colonne | Type | Description |
|---|---|---|
| id | uuid PK | |
| company_id | uuid FK | |
| stock_item_id | uuid FK | Article concerne |
| movement_type | text | reception, assign_contract, unassign_contract, swap_out, swap_in, repair_start, repair_end, scrap, sell |
| from_status | text | Statut avant |
| to_status | text | Statut apres |
| contract_id | uuid nullable | Contrat lie |
| related_stock_item_id | uuid nullable | Article lie (ex: swap) |
| cost | numeric nullable | Cout associe (reparation, etc.) |
| notes | text nullable | |
| performed_by | uuid FK | Utilisateur |
| created_at | timestamptz | |

### 3. `stock_repairs` -- suivi des reparations
| Colonne | Type | Description |
|---|---|---|
| id | uuid PK | |
| company_id | uuid FK | |
| stock_item_id | uuid FK | |
| reason | text | Raison (panne, casse, retour client...) |
| description | text nullable | Details |
| repair_cost | numeric | Cout |
| supplier_id | uuid FK nullable | Reparateur |
| status | text | pending, in_progress, completed, abandoned |
| started_at | date | |
| completed_at | date nullable | |
| result_condition | text nullable | Etat apres reparation |
| notes | text nullable | |
| created_at / updated_at | timestamptz | |

## Fonctionnalites

### 1. Lien avec les commandes fournisseurs existantes

Quand un equipement est recu via le systeme de commandes (`equipment_order_units` ou `contract_equipment` avec `order_status = 'received'`), un `stock_item` est automatiquement cree via un trigger ou une action manuelle. Les informations fournisseur, prix, reference commande sont reprises.

### 2. Stock non lie a un contrat

Articles achetes en anticipation (hors contrat) : creation manuelle d'un `stock_item` avec statut `in_stock`. Lors de la creation d'un contrat, on peut piocher dans le stock existant plutot que commander.

### 3. Swap / Remplacement materiel

Workflow en 3 etapes :
1. L'admin selectionne l'equipement en panne sur le contrat
2. Il choisit un article de remplacement dans le stock (`in_stock`)
3. Le systeme cree deux mouvements :
   - `swap_out` : l'ancien article passe de `assigned` a `in_repair`
   - `swap_in` : le nouvel article passe de `in_stock` a `assigned`
4. Une fiche de reparation (`stock_repairs`) est creee pour l'ancien article

### 4. Recuperation en fin de contrat

Quand un contrat se termine, les articles assignes peuvent etre :
- **Remis en stock** (`in_stock`) avec mise a jour de la condition
- **Vendus au client** (option d'achat) -> statut `sold`
- **Mis au rebut** -> statut `scrapped`

### 5. Tableau de bord stock

Nouvelle page admin accessible via la sidebar (icone Warehouse) :
- **Vue d'ensemble** : compteurs par statut (en stock, attribues, en reparation)
- **Liste des articles** : filtrable par statut, produit, fournisseur, condition
- **Historique des mouvements** : timeline de tous les mouvements
- **Reparations en cours** : liste des articles en reparation avec couts

## Modifications des composants existants

### Sidebar
- Ajout d'un lien "Stock" dans la navigation admin (icone `Warehouse`)

### Page Commandes (`EquipmentOrders`)
- Bouton "Ajouter au stock" quand un equipement passe au statut `received`

### Detail Contrat
- Section "Materiel assigne" avec lien vers les articles de stock
- Bouton "Swap" pour declencher le remplacement
- Actions de fin de contrat (recuperer / vendre / rebuter)

## Details techniques

### Migration SQL
- Creation des 3 tables avec RLS policies (filtrage par `company_id`)
- Index sur `company_id`, `status`, `serial_number`, `current_contract_id`
- Trigger optionnel sur `equipment_order_units` pour creer un `stock_item` a la reception

### Nouveaux fichiers
- `src/services/stockService.ts` : CRUD stock_items, mouvements, reparations
- `src/pages/admin/StockManagement.tsx` : page principale avec onglets
- `src/components/stock/StockDashboard.tsx` : compteurs et resume
- `src/components/stock/StockItemList.tsx` : liste filtrable
- `src/components/stock/StockMovementHistory.tsx` : historique
- `src/components/stock/StockRepairList.tsx` : reparations
- `src/components/stock/SwapDialog.tsx` : dialog de swap
- `src/components/stock/StockItemForm.tsx` : creation/edition manuelle
- `src/components/stock/EndOfContractActions.tsx` : actions fin de contrat
- `src/hooks/useStockItems.ts` : hook de chargement des articles
- Route dans `App.tsx` : `stock` sous `/:companySlug/admin/*`

### Lien avec l'existant
- Les fournisseurs existants (`suppliers`) sont reutilises
- Les produits du catalogue (`products`) sont lies via `product_id`
- Les contrats (`contracts`) et equipements (`contract_equipment`) sont lies
- Le systeme de commandes (`equipment_order_units`) alimente le stock a la reception
