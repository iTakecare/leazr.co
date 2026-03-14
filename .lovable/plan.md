

## Plan : UI d'administration des options de catégories par pack partenaire

### Contexte

Le modèle de données (`partner_pack_options`), les services (`fetchPartnerPackOptions`, `upsertPartnerPackOption`, `deletePartnerPackOption`), et l'API (`catalog-api` enrichit déjà les options avec `allowed_products`) sont **tous déjà en place**. Il manque uniquement l'interface admin pour gérer ces options.

### Ce qui sera créé

**1. Nouveau composant `PartnerPackOptionsEditor`** (`src/components/partners/PartnerPackOptionsEditor.tsx`)

Un panneau qui s'ouvre quand on clique sur un pack personnalisable dans le `PartnerPackManager`. Il permet de :
- Lister les options (catégories) déjà configurées pour ce pack
- Ajouter une nouvelle option avec :
  - **Nom de catégorie** : texte libre ou sélection depuis les catégories existantes
  - **Obligatoire** : switch oui/non
  - **Quantité max** : nombre
  - **Produits autorisés** : multi-sélection de produits depuis le catalogue, filtrés par catégorie
- Modifier/supprimer une option existante
- Réordonner les options (position)

**2. Modification de `PartnerPackManager`**

- Ajouter un bouton "Gérer les options" sur chaque ligne de pack où `is_customizable` est activé
- Ouvrir le `PartnerPackOptionsEditor` au clic

### Détail technique

- Récupérer les catégories via `getCategories()` pour proposer les noms
- Récupérer les produits par catégorie via `getProducts()` filtrés pour le multi-select des `allowed_product_ids`
- Utiliser `useQuery` pour `fetchPartnerPackOptions(partnerPackId)` 
- Utiliser `useMutation` avec `upsertPartnerPackOption` et `deletePartnerPackOption`
- Composant Combobox ou Select pour le choix des produits autorisés

### Fichiers impactés

| Fichier | Action |
|---|---|
| `src/components/partners/PartnerPackOptionsEditor.tsx` | Créer |
| `src/components/partners/PartnerPackManager.tsx` | Ajouter bouton "Options" par pack customizable |

