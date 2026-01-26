# Plan : Double Dashboard avec Personnalisation

## Statut : ✅ IMPLÉMENTÉ

### Fonctionnalités réalisées

1. **Table `user_preferences`** - Stocke les préférences utilisateur (dashboard par défaut, layout, sidebar)
2. **Hook `useUserPreferences`** - Gestion CRUD des préférences
3. **Service `commercialDashboardService`** - Récupération des données du dashboard commercial
4. **4 Cartes Dashboard Commercial** :
   - `CommercialStatsCard` - Statistiques (nouvelles demandes, taux conversion, etc.)
   - `RecentActivityCard` - Activité récente (demandes/contrats)
   - `PendingTasksCard` - Tâches en attente (docs, relances, bloqués)
   - `RecentNotesCard` - Notes récentes
5. **`CommercialDashboard`** - Assemblage avec mode édition drag-and-drop
6. **Page `Dashboard.tsx`** - Onglets Financier/Commercial
7. **Sidebar repliée par défaut** - État sauvegardé par utilisateur
8. **Sélecteur dashboard par défaut** - Dans la page UpdateProfile

### Accès
- Dashboard : Page d'accueil avec onglets
- Préférences : Page "Mettre à jour le profil"
