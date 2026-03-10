

# Plan : Modale email de suivi + Suppression EquipmentOrderTracker

## 1. Modale d'édition et envoi manuel de l'email de suivi

**Fichier nouveau** : `src/components/contracts/FollowupEmailModal.tsx`

Créer une modale (Dialog) qui s'ouvre au clic sur les badges d'email de suivi dans `ContractDetailHeader.tsx`. La modale contient :
- **Aperçu/édition HTML** : Le template HTML de l'email est généré côté client en reprenant la même logique que l'Edge Function (`send-welcome-followup-email`), avec le branding de la company (logo, couleur, nom). L'utilisateur peut éditer le contenu HTML via un éditeur (ReactQuill en mode HTML ou un textarea HTML brut).
- **Destinataire** : Affichage de l'email du client (éditable si besoin).
- **Sujet** : Pré-rempli avec "👋 Comment se passe votre nouvelle installation ?" (éditable).
- **Bouton "Envoyer manuellement"** : Appelle une Edge Function (on réutilise `send-welcome-followup-email` en mode manuel avec un body `{ contractId, html, subject, to }`) ou on crée un appel direct à Resend via une nouvelle Edge Function simple `send-manual-followup-email`.
- **Bouton "Aperçu"** : Affiche le rendu HTML dans un iframe intégré.

**Fichier modifié** : `src/components/contracts/ContractDetailHeader.tsx`
- Rendre les 3 badges email (envoyé, planifié, en attente) cliquables avec `cursor-pointer`.
- Au clic, ouvrir `FollowupEmailModal` en lui passant le contrat et les infos company.

**Fichier nouveau** : `supabase/functions/send-manual-followup-email/index.ts`
- Edge Function qui accepte un `contractId`, `to`, `subject`, `html` en POST.
- Vérifie l'authentification de l'utilisateur appelant.
- Envoie via Resend avec le `reply_to` de l'utilisateur connecté.
- Met à jour `welcome_followup_sent_at` sur le contrat.

## 2. Supprimer EquipmentOrderTracker de la page contrat

**Fichier modifié** : `src/pages/ContractDetail.tsx`
- Supprimer l'import et le rendu de `EquipmentOrderTracker` (lignes ~148-153).
- Le composant `ContractPurchaseTracking` gère déjà le fournisseur, le statut de commande, le prix réel, les dates, les notes, et le split en unités — il est plus complet. Les champs "Référence commande" et "Prix fournisseur" du `EquipmentOrderTracker` sont déjà couverts par le `ContractPurchaseTracking` (via `order_reference` dans les unités et `actual_purchase_price`).

### Fichiers impactés

| Fichier | Action |
|---|---|
| `src/components/contracts/FollowupEmailModal.tsx` | Nouveau — Modale édition + envoi email |
| `src/components/contracts/ContractDetailHeader.tsx` | Badges cliquables → ouvrent la modale |
| `supabase/functions/send-manual-followup-email/index.ts` | Nouveau — Edge Function envoi manuel |
| `src/pages/ContractDetail.tsx` | Retirer `EquipmentOrderTracker` |

