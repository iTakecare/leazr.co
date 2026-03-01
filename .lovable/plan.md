

# Nouvel onglet "Materiel en cours" dans la fiche client

## Objectif

Ajouter un 5e onglet dans `UnifiedClientView` qui affiche tout le materiel issu des contrats actifs du client, avec pour chaque equipement le lien vers le contrat associe. Cela permet de voir en un coup d'oeil le parc materiel en cours chez le client.

## Approche

### 1. Creer un nouveau composant `ClientActiveEquipment`

**Fichier** : `src/components/clients/ClientActiveEquipment.tsx`

Ce composant :
- Recoit `clientId` et `clientEmail` en props
- Utilise le hook `useClientContracts` existant pour recuperer les contrats du client (il inclut deja la jointure sur `contract_equipment`)
- Filtre les contrats avec un statut actif (`active`, `signed`, `in_progress`)
- Construit une liste a plat de tous les equipements avec les infos du contrat parent
- Affiche un tableau avec les colonnes :
  - **Designation** : titre de l'equipement
  - **Quantite**
  - **N de serie** (si disponible)
  - **Contrat** : numero du contrat (lien cliquable vers la page du contrat)
  - **Statut contrat** : badge du statut
  - **Echeance** : date de fin du contrat
- Gere les etats de chargement et liste vide

### 2. Modifier `UnifiedClientView` pour ajouter l'onglet

**Fichier** : `src/components/clients/UnifiedClientView.tsx`

Modifications :
- Importer `ClientActiveEquipment` et l'icone `Monitor` de lucide-react
- Passer la grille des onglets de `grid-cols-4` a `grid-cols-5`
- Ajouter un nouveau `TabsTrigger` "Materiel" entre "Sites de livraison" et "Logo"
- Ajouter le `TabsContent` correspondant avec le composant `ClientActiveEquipment`

### 3. Enrichir le hook `useClientContracts`

Le hook recupere deja `contract_equipment (id, title, quantity)`. Il faut ajouter `serial_number` a la selection pour l'afficher dans le tableau.

**Fichier** : `src/hooks/useClientContracts.ts`

Modification de la requete select pour inclure `serial_number` dans la jointure `contract_equipment`.

## Detail technique

### Structure du tableau (ClientActiveEquipment)

```text
+---------------------+-----+------------+-----------+--------+-----------+
| Designation         | Qte | N serie    | Contrat   | Statut | Echeance  |
+---------------------+-----+------------+-----------+--------+-----------+
| Lenovo ThinkPad X1  |  2  | SN123, ... | CTR-001   | Actif  | 01/2028   |
| HP LaserJet Pro     |  1  |     -      | CTR-002   | Actif  | 06/2027   |
+---------------------+-----+------------+-----------+--------+-----------+
```

### Fichiers modifies

| Fichier | Changement |
|---|---|
| `src/components/clients/ClientActiveEquipment.tsx` | Nouveau composant (tableau du parc materiel) |
| `src/components/clients/UnifiedClientView.tsx` | Ajout du 5e onglet "Materiel" |
| `src/hooks/useClientContracts.ts` | Ajout de `serial_number` dans la requete |

### Aucune migration DB necessaire

Toutes les donnees existent deja dans `contracts` et `contract_equipment`. On utilise les colonnes existantes.

