

# Plan : Suivi des commandes fournisseurs par equipement

## Objectif

Permettre de savoir, pour chaque equipement de chaque demande/contrat, s'il a ete commande, chez quel fournisseur, a quel prix, et son statut actuel. Inclut une vue dans chaque contrat/demande + une vue globale centralisee.

## Statuts de commande

4 statuts : **A commander** / **Commande** / **Recu** / **Annule**

## Modifications en base de donnees

### Nouveaux champs sur `offer_equipment`

| Champ | Type | Description |
|-------|------|-------------|
| `order_status` | text | Statut de commande (to_order, ordered, received, cancelled). Defaut: `to_order` |
| `supplier_id` | uuid (FK suppliers) | Fournisseur choisi |
| `supplier_price` | numeric | Prix d'achat fournisseur reel |
| `order_date` | timestamptz | Date de commande |
| `order_reference` | text | Reference de commande fournisseur |
| `reception_date` | timestamptz | Date de reception |
| `order_notes` | text | Notes libres |

### Nouveaux champs sur `contract_equipment`

Memes champs que ci-dessus (symetrie offer/contract).

| Champ | Type | Description |
|-------|------|-------------|
| `order_status` | text | Defaut: `to_order` |
| `supplier_id` | uuid (FK suppliers) | Fournisseur choisi |
| `supplier_price` | numeric | Prix fournisseur |
| `order_date` | timestamptz | Date de commande |
| `order_reference` | text | Reference commande |
| `reception_date` | timestamptz | Date de reception |
| `order_notes` | text | Notes |

### Pre-remplissage automatique

Quand un equipement a un `product_id`, le systeme cherchera le fournisseur prefere dans `product_supplier_prices` (ou `is_preferred = true`) pour pre-remplir `supplier_id` et `supplier_price`. L'utilisateur pourra toujours modifier.

## Composants a creer/modifier

### 1. Composant `EquipmentOrderTracker` (nouveau)

Composant reutilisable affichant le tableau de suivi pour un contrat ou une demande :

- Tableau avec colonnes : Equipement, Fournisseur (dropdown), Prix fournisseur, Statut (badge cliquable), Date commande, Reference, Notes
- Badges de couleur par statut : rouge (a commander), orange (commande), vert (recu), gris (annule)
- Possibilite de changer le statut en un clic
- Resume en haut : X/Y commandes, X/Y recu, total a commander

### 2. Integration dans le detail contrat

Remplacer ou completer le composant `ContractPurchaseTracking` existant avec le nouveau tracker. Le composant actuel gere deja le prix d'achat reel - on y ajoute fournisseur et statut de commande.

### 3. Integration dans le detail offre

Ajouter le tracker dans la page de detail d'une offre (pour les demandes qui necessitent deja du materiel).

### 4. Page globale "Commandes fournisseurs" (nouvelle)

Nouvelle page accessible depuis le menu admin, regroupant tous les equipements de tous les contrats et demandes :

- Filtres : par statut (a commander / commande / recu / annule), par fournisseur, par contrat/demande
- Tableau avec colonnes : Contrat/Demande, Client, Equipement, Fournisseur, Prix, Statut, Date commande
- Totaux : montant total a commander, montant commande, montant recu
- Lien direct vers le contrat/demande concerne
- Onglet "A commander" par defaut pour voir immediatement ce qu'il reste a faire

## Fichiers concernes

| Fichier | Action |
|---------|--------|
| Migration SQL | Ajouter les colonnes sur `offer_equipment` et `contract_equipment` |
| `src/components/contracts/EquipmentOrderTracker.tsx` | Creer - composant reutilisable |
| `src/services/equipmentOrderService.ts` | Creer - service CRUD pour les commandes |
| `src/pages/admin/EquipmentOrders.tsx` | Creer - page vue globale |
| `src/components/contracts/ContractPurchaseTracking.tsx` | Modifier - integrer le suivi fournisseur |
| `src/components/offers/detail/NewEquipmentSection.tsx` | Modifier - ajouter bouton/lien vers le suivi |
| Routes et navigation admin | Ajouter la nouvelle page |

## Resultat attendu

- Chaque equipement de chaque contrat/demande a un statut de commande, un fournisseur et un prix fournisseur
- Le fournisseur prefere est pre-rempli automatiquement depuis le catalogue
- Une vue globale permet de voir d'un coup tout le materiel restant a commander, trie par fournisseur
- Meme les contrats actifs peuvent avoir du materiel encore a commander ou en attente de reception

