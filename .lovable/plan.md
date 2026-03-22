

# Ajouter colonnes N° contrat, N° demande, Entreprise au tableau des contrats

## Modifications

### Fichier : `src/components/contracts/ContractsTable.tsx`

1. **Ajouter 3 nouvelles colonnes** dans le `TableHeader` (après "Date", avant "Client") :
   - **N° Contrat** : affiche `contract.contract_number` (ou "-")
   - **N° Demande** : affiche `contract.offer_dossier_number`, cliquable → navigue vers `/offers/{contract.offer_id}`
   - **Entreprise** : affiche `contract.clients?.company` (ou "-")

2. **Ajouter les cellules correspondantes** dans le `TableBody` pour chaque contrat.

3. **Réduire la taille de police du tableau** : ajouter `text-xs` au composant `Table` pour que tout tienne sur un seul écran sans défilement horizontal.

4. **Réduire le padding des cellules** : utiliser des classes plus compactes (`px-2 py-1.5`) sur les cellules.

5. **Ajouter le tri** sur les nouvelles colonnes `contract_number` et `company` dans le `SortableTableHead` et le `useMemo` de tri.

### Données déjà disponibles

Les champs `contract_number`, `offer_dossier_number`, `offer_id` et `clients.company` sont déjà présents dans le type `Contract` et chargés par `getContracts()`. Aucune modification de requête ou migration nécessaire.

