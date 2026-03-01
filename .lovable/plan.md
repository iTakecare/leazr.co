

# Ajouter l'edition des articles de stock

## Objectif
Permettre de cliquer sur un article dans la liste du stock pour ouvrir un formulaire pre-rempli et modifier ses informations.

## Modifications

### 1. StockItemList.tsx - Ajouter un clic sur les lignes
- Ajouter une prop `onEdit(item)` ou un state local pour l'article selectionne
- Rendre chaque `TableRow` cliquable avec un curseur pointer
- Ajouter un bouton d'action (icone crayon) dans une nouvelle colonne "Actions"
- Au clic, ouvrir le formulaire d'edition avec l'article selectionne

### 2. StockItemForm.tsx - Support du mode edition
- Ajouter une prop optionnelle `editItem?: StockItem` au composant
- Pre-remplir tous les champs du formulaire quand `editItem` est fourni
- Changer le titre du dialog : "Modifier l'article" au lieu de "Nouvel article"
- Changer le bouton de soumission : "Enregistrer" au lieu de "Creer"
- Appeler une fonction `updateStockItem` au lieu de `createStockItem` en mode edition
- Enregistrer un mouvement de type "update" dans l'historique si le statut change

### 3. stockService.ts - Ajouter la fonction de mise a jour
- Creer `updateStockItem(id, data)` qui fait un UPDATE sur `stock_items`
- Gerer le changement de statut : creer automatiquement un mouvement si le statut a change

### 4. StockManagement.tsx - Connecter le tout
- Ajouter un state `editingItem` pour stocker l'article en cours d'edition
- Passer une callback `onEdit` a `StockItemList`
- Passer `editItem` a `StockItemForm`

## Flux utilisateur
1. L'utilisateur voit la liste des articles
2. Il clique sur l'icone crayon ou sur la ligne
3. Le formulaire s'ouvre pre-rempli avec toutes les donnees
4. Il modifie les champs souhaites
5. Il clique "Enregistrer"
6. L'article est mis a jour, la liste se rafraichit

## Fichiers modifies

| Fichier | Action |
|---|---|
| `src/services/stockService.ts` | Ajouter `updateStockItem()` |
| `src/components/stock/StockItemForm.tsx` | Ajouter prop `editItem`, pre-remplissage, mode edition |
| `src/components/stock/StockItemList.tsx` | Ajouter colonne Actions avec bouton edition + callback `onEdit` |
| `src/pages/admin/StockManagement.tsx` | State `editingItem`, connecter liste et formulaire |

