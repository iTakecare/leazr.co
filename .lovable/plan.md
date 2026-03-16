

## Plan : Implémentation des lots restants (3-6)

L'essentiel du Lot 1 (Dashboard, stepper, design unifié) et du Lot 2 (timeline contrats, renouvellement, edge functions, migrations DB) est déjà en place. Voici ce qui reste.

---

### LOT 3 : Admin Knowledge Base (nouvel onglet Support)

**`src/pages/admin/SupportPage.tsx`**
- Ajouter un 5e onglet "Base de connaissances" avec icone `BookOpen`

**Nouveau `src/components/support/KnowledgeBaseManager.tsx`**
- CRUD complet sur la table `support_knowledge_base` existante
- Formulaire : titre, contenu (textarea riche), catégorie (select: général, contrats, équipements, facturation)
- Liste des articles avec recherche, toggle actif/inactif, suppression
- Utiliser `useMultiTenant` pour le `company_id`

---

### LOT 4 : Refonte Support Client + Tickets

**`src/pages/ClientSupportPage.tsx`** (refonte complète)
- Section "Ouvrir un ticket" : formulaire avec catégorie (dropdown : Problème technique, Question facturation, Demande modification, Autre), sujet, description
- Insert dans `support_tickets` avec `client_id`, `category`, `status: 'open'`
- Liste des tickets du client (fetch par `client_id`) avec badges de statut
- FAQ dynamique : fetch `support_knowledge_base` active pour la company du client
- Coordonnées réelles : `support@itakecare.be`, `+32 (0)10 23 45 67`
- Bouton "Ouvrir le chat IA" qui toggle le widget existant
- Style Bento Grid (déjà partiellement appliqué)

**RLS** : Ajouter policy pour que les clients lisent/créent leurs propres tickets via `client_id`

---

### LOT 5 : Catalogue client aligné sur itakecare.be

**`src/components/catalog/client/ClientCatalogAnonymous.tsx`**
- Ajouter un hero banner en haut : gradient + titre "Notre catalogue" + 3 avantages (reconditionné, garanti, livré)
- Remplacer le sidebar de filtres par des filtres horizontaux compacts (catégories en chips scrollables)
- Images produits plus grandes dans la grille
- Onglets Produits/Packs plus visibles (style pill)
- Style arrondi `rounded-2xl` cohérent

---

### LOT 6 : Refonte Équipements + Emplacements

**`src/pages/ClientEquipmentPage.tsx`** (refonte complète)
- Tabs switchables : "Par contrat" / "Par équipement"
- **Vue par contrat** : fetch contracts avec equipment, affiche chaque contrat comme une card avec ses équipements en liste, assignation visible (collaborateur ou emplacement)
- **Vue par équipement** : liste plate, colonnes (nom, serial, contrat, assigné à, emplacement)
- Barre de filtres : recherche texte, filtre par collaborateur, filtre par emplacement
- Section "Gérer les emplacements" : modale pour CRUD sur `equipment_locations` (site_name + location_name)
- Bouton pour assigner un équipement à un emplacement (en plus des collaborateurs existants)

**Nouveau `src/components/equipment/LocationManager.tsx`**
- Dialog avec formulaire site + emplacement
- Liste arborescente : Site > Emplacements
- Suppression et édition

---

### Fichiers à créer/modifier

| Fichier | Action |
|---------|--------|
| `src/pages/admin/SupportPage.tsx` | Ajouter onglet Knowledge Base |
| `src/components/support/KnowledgeBaseManager.tsx` | Nouveau - CRUD articles KB |
| `src/pages/ClientSupportPage.tsx` | Refonte avec tickets + FAQ + vraies coordonnées |
| `src/components/catalog/client/ClientCatalogAnonymous.tsx` | Hero banner + filtres horizontaux |
| `src/pages/ClientEquipmentPage.tsx` | Refonte 2 vues + filtres |
| `src/components/equipment/LocationManager.tsx` | Nouveau - gestion emplacements |
| Migration SQL | RLS tickets pour clients |

