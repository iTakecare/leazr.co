
# Corrections de l'affichage dans la modale des taches

## Problemes identifies

1. **Dropdown Offres** : Affiche des identifiants bruts (UUID) ou du JSON au lieu d'un libelle lisible. Le champ `equipment_description` est souvent un JSON et le fallback affiche l'ID tronque.
2. **Liste Clients** : Le dropdown custom manque de style (pas de separation visuelle entre les items, pas assez de contraste).
3. **Dropdown Contrats** : Affiche `client_name` qui est redondant puisque le client est deja selectionne.

## Corrections prevues

### 1. Service `taskService.ts` -- Ameliorer les donnees recuperees

- `fetchClientOffers` : ajouter les champs `client_name`, `monthly_payment`, `created_at`, `workflow_status` pour construire un libelle plus parlant.
- `fetchClientContracts` : garder tel quel mais ameliorer l'affichage.

### 2. `TaskDialog.tsx` -- Affichage propre des offres et contrats

**Offres** : Afficher un libelle du type `"Offre du 12/02/2026 - 450EUR/mois (en cours)"` au lieu du JSON brut. Parser `equipment_description` pour extraire un resume si c'est du JSON, sinon utiliser les premiers caracteres.

**Contrats** : Afficher `"Contrat #123 - Leaser XYZ - 350EUR/mois"` au lieu du nom client redondant.

### 3. `ClientSearchInput.tsx` -- Ameliorer le style du dropdown

- Ajouter des bordures de separation entre les items (`border-b`)
- Ameliorer le contraste avec `bg-background` au lieu de `bg-popover`
- Ajouter une icone de recherche plus visible
- Style hover plus marque avec `bg-accent`
- Padding et taille de police coherents avec les Select natifs

## Details techniques

### `src/services/taskService.ts`
- Modifier `fetchClientOffers` : ajouter `client_name, monthly_payment, created_at, workflow_status` au select.

### `src/components/tasks/TaskDialog.tsx`
- Ajouter une fonction `formatOfferLabel(offer)` qui construit un libelle lisible a partir de la date, du montant et du statut.
- Ajouter une fonction `formatContractLabel(contract)` similaire.
- Remplacer les affichages bruts dans les `SelectItem` par ces fonctions.

### `src/components/tasks/ClientSearchInput.tsx`
- Ajouter `divide-y` sur le conteneur dropdown pour separer les items.
- Utiliser `bg-background border shadow-lg` pour un rendu plus propre.
- Ajouter `hover:bg-accent` au lieu de `hover:bg-muted`.
- Ajouter un texte d'en-tete "Selectionner un client" dans le dropdown.
