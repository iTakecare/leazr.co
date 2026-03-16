

## Plan global : Refonte complète de l'espace client

Ce plan couvre 7 chantiers majeurs. Etant donne l'ampleur, je recommande de les implementer par lots dans l'ordre ci-dessous, mais dans un flux continu.

---

### LOT 1 : Design unifie + Dashboard fix + Stepper detaille

**Probleme** : Le texte du banner est blanc sur fond gris clair (illisible). Les autres pages (Contrats, Demandes, Equipements, Support, Parametres) n'ont pas le meme style Bento Grid.

**Modifications :**

**`src/pages/ClientDashboard.tsx`**
- Corriger la banniere : forcer `text-white` ou utiliser un gradient plus sombre
- Remplacer le stepper simplifie (4 etapes) par un stepper detaille mappant les vrais `workflow_status` de l'offre : `draft` → `internal_review` → `internal_docs_requested` → `internal_approved` → `leaser_introduced` → `leaser_scoring` → `offer_send` → `accepted` → `contract_sent` → `contract_signed`
- Chaque etape affichee avec son label traduit et l'etape active en surbrillance

**`src/hooks/useClientData.ts`**
- Enrichir les offres fetchees avec `workflow_status` (pas seulement `status`)
- Fetch les contrats actifs avec `start_date`, `duration`, `end_date` pour la timeline

**Toutes les pages client** (`ClientContractsPage`, `ClientRequestsPage`, `ClientEquipmentPage`, `ClientSupportPage`, `ClientSettingsPage`) :
- Appliquer le meme style : `max-w-7xl mx-auto`, `rounded-2xl`, `border-0 shadow-sm`, `framer-motion` stagger
- Remplacer les squelettes `bg-gray-200` par `bg-muted`
- Headers de page avec meme structure que le dashboard (titre + description + actions)

---

### LOT 2 : Timeline contrats + Bouton renouvellement

**`src/pages/ClientContractsPage.tsx`** (refonte)
- Pour chaque contrat actif, afficher une barre de progression horizontale : mois ecoules / duree totale
- Afficher le nombre de mois restants
- Apres 18 mois : bouton "Renouveler mon materiel" (couleur primaire, anime)
- Clic ouvre une **modale de renouvellement**

**Nouvelle modale `RenewalRequestModal`**
- Pre-remplie avec l'equipement du contrat (parse `equipment_description`)
- Champ texte personnalisable pour le client
- Appel IA (Lovable AI via edge function) pour generer des suggestions de nouveau materiel base sur l'equipement actuel
- A la soumission : cree une offre cote admin avec `type: 'renewal_request'` et le contrat source lie

**Nouvelle edge function `suggest-renewal-equipment`**
- Recoit l'equipement actuel, utilise Gemini pour suggerer des remplacements modernes
- Retourne 2-3 suggestions textuelles

**Migration DB** : Ajouter colonne `renewal_source_contract_id` a la table `offers` pour tracer les renouvellements

---

### LOT 3 : Chat IA client (widget flottant)

**Tables DB** (migrations) :
- `support_knowledge_base` : `id`, `company_id`, `title`, `content`, `category`, `active`, `created_at`, `updated_at`
- `chat_conversations_ai` : `id`, `client_id`, `company_id`, `status`, `created_at`
- `chat_messages_ai` : `id`, `conversation_id`, `role` (user/assistant/system), `content`, `created_at`

**Admin : nouvel onglet "Base de connaissances"** dans Support
- `src/pages/admin/SupportKnowledgeBase.tsx` : CRUD pour ajouter des articles/FAQ que le chatbot utilisera
- Integre dans la navigation existante du module Support

**Edge function `client-ai-chat`**
- Recoit le message du client + son historique de conversation
- Construit un prompt avec : les articles de la knowledge base, les donnees du client (contrats, offres, equipement)
- Utilise Lovable AI (Gemini) pour repondre
- Si le modele ne peut pas repondre (confidence faible) : retourne un flag `suggest_ticket: true`

**Widget flottant `AIChatWidget.tsx`**
- Bulle en bas a droite, toujours visible sur les pages client
- Interface de chat avec streaming des reponses
- Bouton "Ouvrir un ticket" si l'IA ne peut pas repondre
- Clic sur "Ouvrir un ticket" → pre-remplit un ticket support avec le contexte de la conversation

---

### LOT 4 : Refonte Support + Tickets

**`src/pages/ClientSupportPage.tsx`** (refonte complete)
- Meme style Bento Grid
- Section principale : "Ouvrir un ticket" avec choix de categorie (Probleme technique, Question facturation, Demande de modification, Autre)
- Liste des tickets existants du client avec statut (ouvert, en cours, resolu)
- Coordonnees mises a jour (email, telephone reels de l'entreprise, pas des placeholders)
- FAQ dynamique (alimentee par `support_knowledge_base`)

**Fonctionnalite tickets client** :
- Le client peut creer un ticket via la page support (formulaire avec sujet, categorie, description)
- Les tickets sont visibles cote admin dans Support → Tickets (deja existant)
- Table `support_tickets` existante, ajout RLS pour que les clients voient leurs propres tickets

---

### LOT 5 : Catalogue client = meme layout que itakecare.be

**`src/components/catalog/client/ClientCatalogAnonymous.tsx`** et pages liees
- Ajouter un hero banner en haut (image + titre "Notre catalogue" + avantages)
- Categories horizontales avec icones et badges de comptage (comme sur itakecare.be)
- Onglets Produits / Packs
- Grille de produits avec images plus grandes, badges CO2, nombre de configs
- Supprimer le panneau de filtres lateral (remplacer par filtres horizontaux compacts)

---

### LOT 6 : Refonte Equipements

**`src/pages/ClientEquipmentPage.tsx`** (refonte)
- Deux vues switchables via tabs : "Par contrat" et "Par equipement"
- **Vue par contrat** : liste des contrats, chacun avec ses equipements et l'assignation (collaborateur ou emplacement)
- **Vue par equipement** : liste plate de tous les equipements avec colonnes (nom, serial, contrat, assigne a, emplacement)
- Filtres : par statut, par collaborateur, par emplacement, recherche texte
- Design Bento Grid coherent

**Emplacements (2 niveaux)** :
- Migration DB : table `equipment_locations` avec `id`, `client_id`, `company_id`, `site_name`, `location_name`, `created_at`
- Colonne `location_id` sur `contract_equipment` (ou table de liaison)
- UI pour gerer les sites et emplacements (modale d'ajout)
- Assignation possible a un collaborateur OU un emplacement (ou les deux)

---

### LOT 7 : Parametres - meme style

**`src/pages/ClientSettingsPage.tsx`**
- Appliquer le style Bento Grid : `rounded-2xl`, `shadow-sm`, `border-0`
- Tabs redesignes
- Meme animation framer-motion

---

### Resume des fichiers touches

| Fichier | Action |
|---------|--------|
| `src/pages/ClientDashboard.tsx` | Fix texte + stepper detaille + timeline contrats |
| `src/hooks/useClientData.ts` | Fetch workflow_status, dates contrats |
| `src/pages/ClientContractsPage.tsx` | Refonte Bento + timeline mois + bouton renouvellement |
| `src/pages/ClientRequestsPage.tsx` | Refonte style Bento Grid |
| `src/pages/ClientEquipmentPage.tsx` | Refonte 2 vues + filtres + emplacements |
| `src/pages/ClientSupportPage.tsx` | Refonte + tickets client + FAQ dynamique |
| `src/pages/ClientSettingsPage.tsx` | Refonte style |
| `src/components/client/RenewalRequestModal.tsx` | Nouveau - modale renouvellement |
| `src/components/client/AIChatWidget.tsx` | Nouveau - widget chat IA flottant |
| `src/components/layout/ClientSidebar.tsx` | Ajout du widget chat |
| `src/pages/admin/SupportKnowledgeBase.tsx` | Nouveau - gestion base connaissances |
| `supabase/functions/client-ai-chat/index.ts` | Nouveau - edge function chat IA |
| `supabase/functions/suggest-renewal-equipment/index.ts` | Nouveau - suggestions renouvellement |
| Migrations DB | `support_knowledge_base`, `chat_conversations_ai`, `chat_messages_ai`, `equipment_locations`, update `offers` |

