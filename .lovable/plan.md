

# Plan : Carte "Relances" dans le détail d'offre (Offre L1/L2/L3 + Docs L1/L2/L3)

## Objectif

Ajouter une carte "Relances" dans la sidebar du détail d'offre, juste sous la carte "Statut", avec les mêmes badges et fonctionnalités de relance que dans le listing (ReminderIndicator + SendReminderModal).

## Fonctionnement

La carte affiche les badges colorés L1/L2/L3 pour les relances offre et/ou documents selon le statut de l'offre. Cliquer sur un badge ouvre le `SendReminderModal` (déjà existant) pré-sélectionné sur le niveau choisi.

- **Statuts offre** (`sent`, `offer_send`, `accepted`) : badges Offre L1, L2, L3 (palette bleue)
- **Statuts documents** (`info_requested`, `internal_docs_requested`) : badges Docs L1, L2, L3 (palette violette)
- Badges grisés/barrés si déjà envoyés, colorés et cliquables sinon

## Modifications

### 1. `src/pages/AdminOfferDetail.tsx`
- Importer `useOfferAllReminders`, `useFetchOfferReminders`, `SendReminderModal`
- Appeler `useFetchOfferReminders([offer.id])` pour récupérer les relances déjà envoyées
- Appeler `useOfferAllReminders(offer, sentReminders)` pour calculer les niveaux disponibles
- Ajouter state `showReminderModal` + passer `allReminders`, `sentReminders`, `onOpenReminder` en nouvelles props à `CompactActionsSidebar`
- Rendre `SendReminderModal` dans le JSX

### 2. `src/components/offers/detail/CompactActionsSidebar.tsx`
- Ajouter props : `allReminders?: AllReminders`, `sentReminders?: any[]`, `onOpenReminder?: () => void`
- Après la carte "Statut", insérer une carte "Relances" qui :
  - Affiche tous les niveaux disponibles via `ReminderIndicator` (utilise `allReminders`)
  - Au clic sur un badge → appelle `onOpenReminder()`
  - Si aucun rappel disponible (statut ne correspond pas), la carte ne s'affiche pas

### Fichiers impactés

| Fichier | Modification |
|---|---|
| `src/pages/AdminOfferDetail.tsx` | Hooks reminders + state modal + rendu SendReminderModal |
| `src/components/offers/detail/CompactActionsSidebar.tsx` | Nouvelle carte "Relances" avec ReminderIndicator |

Aucun nouveau composant à créer, réutilisation de `ReminderIndicator` et `SendReminderModal` existants.

