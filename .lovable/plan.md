

## Pré-remplir la base de connaissances avec des articles par défaut

### Approche

Ajouter un bouton "Pré-remplir avec des articles par défaut" dans le `KnowledgeBaseManager` qui insère en masse ~20 articles couvrant les 4 catégories. Les articles sont définis en dur dans un fichier de constantes et insérés via Supabase avec le `company_id` de l'admin connecté.

### Articles prévus

**Général (5 articles)**
- Qu'est-ce que le leasing informatique ?
- Comment fonctionne iTakecare ?
- Avantages du leasing vs achat
- Quels types d'équipements peut-on financer ?
- Comment contacter le support ?

**Contrats (6 articles)**
- Comment signer un contrat ?
- Quelle est la durée d'un contrat de leasing ?
- Comment résilier ou modifier un contrat ?
- Que se passe-t-il à la fin du contrat ?
- Comment consulter mes contrats en cours ?
- Qu'est-ce que l'apport initial (down payment) ?

**Équipements (5 articles)**
- Comment demander un nouvel équipement ?
- Comment signaler une panne ou un problème ?
- Marques et modèles disponibles
- Renouvellement d'équipement
- Suivi et inventaire de mes équipements

**Facturation (4 articles)**
- Comment sont calculées les mensualités ?
- Où consulter mes factures ?
- Que faire en cas d'impayé ?
- Comment modifier mes coordonnées de facturation ?

### Fichiers impactés

1. **`src/constants/defaultKnowledgeBaseArticles.ts`** (nouveau) — tableau de ~20 articles `{ title, content, category }` avec du contenu riche en markdown
2. **`src/components/support/KnowledgeBaseManager.tsx`** — ajout d'un bouton "Pré-remplir" visible uniquement quand la base est vide, qui appelle `supabase.from('support_knowledge_base').insert(articles)` avec le `company_id` courant

### Détails techniques
- Pas de migration SQL, pas d'edge function — insertion directe via le client Supabase (l'admin a déjà les droits RLS)
- Le bouton est conditionnel : affiché uniquement si `articles.length === 0`
- Après insertion, invalidation du cache React Query pour rafraîchir la liste

