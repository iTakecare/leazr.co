

# Ajout de la gestion des fournisseurs dans les commandes

## Contexte actuel

- **Page globale (`EquipmentOrders.tsx`)** : la colonne "Fournisseur" affiche juste le nom, sans possibilite de le modifier.
- **Tracker detail (`EquipmentOrderTracker.tsx`)** : le fournisseur est modifiable via un Select en mode edition (bouton crayon), mais on ne peut que choisir parmi les fournisseurs existants, pas en creer un nouveau.

## Solution proposee

### 1. Composant reutilisable `SupplierSelectOrCreate`

Creer un composant qui combine :
- Un **Select** avec la liste des fournisseurs existants
- Un bouton **"+ Nouveau fournisseur"** en bas de la liste
- Un **Dialog** qui s'ouvre pour creer rapidement un fournisseur (nom, email, telephone minimum)
- Apres creation, le nouveau fournisseur est automatiquement selectionne

Ce composant sera utilise dans les deux vues (globale et detail).

### 2. Modification de la page globale `EquipmentOrders.tsx`

- Rendre la colonne "Fournisseur" cliquable/editable directement dans le tableau
- Remplacer le texte statique par le composant `SupplierSelectOrCreate`
- La selection/creation d'un fournisseur sauvegarde immediatement en base

### 3. Modification du tracker detail `EquipmentOrderTracker.tsx`

- Remplacer le Select fournisseur existant (en mode edition) par le composant `SupplierSelectOrCreate`
- Permet de creer un fournisseur sans quitter la page

## Fichiers concernes

| Fichier | Action |
|---------|--------|
| `src/components/equipment/SupplierSelectOrCreate.tsx` | **Nouveau** - Composant reutilisable Select + creation |
| `src/pages/admin/EquipmentOrders.tsx` | Rendre la colonne fournisseur editable avec le nouveau composant |
| `src/components/contracts/EquipmentOrderTracker.tsx` | Remplacer le Select fournisseur par le nouveau composant |

## Detail technique

### `SupplierSelectOrCreate`

```text
Props:
  - suppliers: { id, name }[]
  - value: string | null
  - onValueChange: (supplierId: string) => void
  - onSupplierCreated: (newSupplier: { id, name }) => void
  - companyId: string
```

Le composant utilise un Popover avec :
- Une liste filtrable des fournisseurs (Command/Combobox)
- Un separateur
- Un bouton "+ Nouveau fournisseur" qui ouvre un Dialog
- Le Dialog contient un formulaire rapide (nom obligatoire, email et telephone optionnels)
- A la creation, appel a `createSupplier` du service existant, puis callback `onSupplierCreated`

### Page globale - edition inline

Chaque ligne du tableau affichera le `SupplierSelectOrCreate` directement (pas besoin de mode edition separe pour le fournisseur). Au changement, sauvegarde immediate via `updateOfferEquipmentOrder` ou `updateContractEquipmentOrder`.

