
# Plan : Double Dashboard avec Personnalisation

## Résumé

Création d'un **Dashboard Commercial** complémentaire au Dashboard Financier existant, avec :
- Navigation par onglets sur la page d'accueil
- Préférences utilisateur stockées en base de données
- Mode édition avec drag-and-drop pour personnaliser les cartes
- Sidebar repliée par défaut

---

## 1. Structure de la Base de Données

### Nouvelle table `user_preferences`

```sql
CREATE TABLE public.user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    default_dashboard TEXT DEFAULT 'financial' CHECK (default_dashboard IN ('financial', 'commercial')),
    dashboard_layout JSONB DEFAULT '{}',
    sidebar_collapsed BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences"
    ON public.user_preferences FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
    ON public.user_preferences FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
    ON public.user_preferences FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);
```

Le champ `dashboard_layout` stockera la configuration des cartes par dashboard :
```json
{
  "commercial": {
    "visible_cards": ["recent_activity", "recent_notes", "pending_tasks", "stats"],
    "card_order": ["stats", "recent_activity", "pending_tasks", "recent_notes"]
  }
}
```

---

## 2. Architecture des Composants

```text
src/
├── pages/
│   └── Dashboard.tsx                    # Page avec onglets Financier/Commercial
├── components/
│   └── dashboard/
│       ├── CompanyDashboard.tsx         # Dashboard Financier (existant)
│       ├── CommercialDashboard.tsx      # NOUVEAU - Dashboard Commercial
│       ├── DashboardTabs.tsx            # NOUVEAU - Navigation par onglets
│       ├── DashboardEditMode.tsx        # NOUVEAU - Bouton mode édition
│       └── cards/
│           ├── RecentActivityCard.tsx   # NOUVEAU - Activité récente globale
│           ├── RecentNotesCard.tsx      # NOUVEAU - Dernières notes
│           ├── PendingTasksCard.tsx     # NOUVEAU - Tâches en attente
│           └── CommercialStatsCard.tsx  # NOUVEAU - Statistiques commerciales
├── hooks/
│   └── useUserPreferences.ts            # NOUVEAU - Gestion préférences
├── services/
│   └── commercialDashboardService.ts    # NOUVEAU - Données du dashboard commercial
└── components/layout/
    └── Sidebar.tsx                      # MODIFIÉ - Replié par défaut
```

---

## 3. Dashboard Commercial - Cartes Prévues

### 3.1 Activité Récente Globale
- Derniers changements de statut sur les demandes
- Derniers changements de statut sur les contrats
- Icônes distinctives par type (demande/contrat)
- Lien cliquable vers le dossier concerné
- Affichage du nom de l'utilisateur ayant fait l'action

### 3.2 Notes Récentes
- 10 dernières notes ajoutées sur les dossiers
- Aperçu du contenu (tronqué à 100 caractères)
- Nom du dossier concerné + lien
- Date et auteur de la note
- Badge par type de note (admin_note, internal_note)

### 3.3 Tâches en Attente
- Documents en attente de réception (`internal_docs_requested`)
- Dossiers nécessitant une relance (> 7 jours sans réponse)
- Dossiers bloqués (scoring en attente depuis > 3 jours)
- Actions requises avec compteur et lien direct

### 3.4 Statistiques Commerciales
- Nombre de dossiers créés (ce mois/semaine)
- Taux de conversion (demandes → contrats signés)
- Délai moyen de traitement
- Comparaison avec période précédente (tendance)

---

## 4. Mode Édition avec Drag-and-Drop

### Fonctionnalités
- Bouton "Personnaliser" dans l'en-tête du dashboard
- Activation du mode édition qui affiche des poignées de déplacement
- Drag-and-drop des cartes (utilisation de `react-beautiful-dnd` déjà installé)
- Checkbox pour masquer/afficher chaque carte
- Bouton "Enregistrer" pour sauvegarder la configuration

### Interface du mode édition
```text
+------------------------------------------+
| Dashboard Commercial        [Personnaliser] |
+------------------------------------------+
  [Mode édition activé]      [Annuler] [Enregistrer]
  
  +------------------+  +------------------+
  | ⋮⋮ Stats ☑️      |  | ⋮⋮ Activité ☑️   |
  +------------------+  +------------------+
  
  +------------------+  +------------------+
  | ⋮⋮ Tâches ☑️     |  | ⋮⋮ Notes ☑️      |
  +------------------+  +------------------+
```

---

## 5. Préférences Utilisateur

### Emplacement du sélecteur
- Dans le dialogue de modification utilisateur (comme montré dans la capture)
- Nouveau champ "Dashboard par défaut" avec dropdown

### Hook `useUserPreferences`
```typescript
interface UserPreferences {
  default_dashboard: 'financial' | 'commercial';
  dashboard_layout: {
    commercial?: {
      visible_cards: string[];
      card_order: string[];
    };
  };
  sidebar_collapsed: boolean;
}

const useUserPreferences = () => {
  // Récupérer les préférences de l'utilisateur
  // Créer les préférences par défaut si inexistantes
  // Mettre à jour les préférences
  return { preferences, updatePreferences, isLoading };
};
```

---

## 6. Sidebar Repliée par Défaut

### Modification `Sidebar.tsx`
- Lire l'état initial depuis `user_preferences.sidebar_collapsed`
- Valeur par défaut : `true` (replié)
- Sauvegarder l'état quand l'utilisateur change

```typescript
// Avant
const [isCollapsed, setIsCollapsed] = useState(false);

// Après
const { preferences, updatePreferences } = useUserPreferences();
const [isCollapsed, setIsCollapsed] = useState(
  preferences?.sidebar_collapsed ?? true  // true par défaut
);
```

---

## 7. Page Dashboard avec Onglets

### Structure de `Dashboard.tsx`
```tsx
const Dashboard = () => {
  const { preferences } = useUserPreferences();
  const [activeTab, setActiveTab] = useState(
    preferences?.default_dashboard || 'financial'
  );

  return (
    <div className="p-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-100 rounded-lg p-1">
          <TabsTrigger value="financial">
            <BarChart3 className="w-4 h-4 mr-2" />
            Financier
          </TabsTrigger>
          <TabsTrigger value="commercial">
            <Users className="w-4 h-4 mr-2" />
            Commercial
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="financial">
          <CompanyDashboard />
        </TabsContent>
        
        <TabsContent value="commercial">
          <CommercialDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
};
```

---

## 8. Service `commercialDashboardService.ts`

### Fonctions à implémenter

```typescript
// Récupérer l'activité récente (offres + contrats)
export const getRecentActivity = async (limit: number = 15);

// Récupérer les dernières notes
export const getRecentNotes = async (limit: number = 10);

// Récupérer les tâches en attente
export const getPendingTasks = async () => {
  // - Docs en attente
  // - Dossiers à relancer
  // - Dossiers bloqués
};

// Statistiques commerciales
export const getCommercialStats = async (period: 'week' | 'month') => {
  // - Nouveaux dossiers
  // - Taux de conversion
  // - Délai moyen
};
```

---

## 9. Fichiers à Créer/Modifier

| Fichier | Action |
|---------|--------|
| `src/pages/Dashboard.tsx` | MODIFIER - Ajouter onglets |
| `src/components/dashboard/CommercialDashboard.tsx` | CRÉER |
| `src/components/dashboard/DashboardTabs.tsx` | CRÉER |
| `src/components/dashboard/DashboardEditMode.tsx` | CRÉER |
| `src/components/dashboard/cards/RecentActivityCard.tsx` | CRÉER |
| `src/components/dashboard/cards/RecentNotesCard.tsx` | CRÉER |
| `src/components/dashboard/cards/PendingTasksCard.tsx` | CRÉER |
| `src/components/dashboard/cards/CommercialStatsCard.tsx` | CRÉER |
| `src/hooks/useUserPreferences.ts` | CRÉER |
| `src/services/commercialDashboardService.ts` | CRÉER |
| `src/components/layout/Sidebar.tsx` | MODIFIER - État replié par défaut |
| `src/components/settings/MultiTenantUserManager.tsx` | MODIFIER - Ajouter sélecteur dashboard |

---

## 10. Ordre d'Implémentation

1. **Base de données** : Créer la table `user_preferences` avec RLS
2. **Hook** : Créer `useUserPreferences` pour gérer les préférences
3. **Sidebar** : Modifier pour être repliée par défaut
4. **Service** : Créer `commercialDashboardService.ts`
5. **Cartes** : Créer les 4 composants de cartes
6. **Dashboard Commercial** : Assembler les cartes dans `CommercialDashboard.tsx`
7. **Page Dashboard** : Ajouter les onglets dans `Dashboard.tsx`
8. **Mode édition** : Implémenter le drag-and-drop
9. **Paramètres** : Ajouter le sélecteur dans le dialogue utilisateur

---

## 11. Design Visuel

Le Dashboard Commercial suivra le même style corporate que le Dashboard Financier :
- Fond gris clair `bg-background`
- Cartes blanches avec ombres légères
- Icônes colorées selon le contexte
- Bordures latérales colorées pour différencier les cartes
- Cohérence avec les couleurs sémantiques (vert=succès, orange=attention, etc.)

```text
+------------------------------------------------------+
| Dashboard Commercial 2026              [Personnaliser] |
+------------------------------------------------------+

+------------------------+  +------------------------+
| 📊 Stats Commerciales  |  | 🔔 Activité Récente    |
| ┌──────┐ ┌──────┐     |  | • Jean a changé...    |
| │ 45   │ │ 67%  │     |  | • Marie a ajouté...   |
| │Dossiers│Conver.│     |  | • Admin a validé...   |
| └──────┘ └──────┘     |  +------------------------+
+------------------------+  
                           +------------------------+
+------------------------+  | 📝 Notes Récentes      |
| ⏳ Tâches en Attente    |  | • Client ABC - "Att.."|
| • 5 docs en attente    |  | • Dossier XYZ - "Re.."|
| • 3 relances à faire   |  +------------------------+
| • 2 dossiers bloqués   |
+------------------------+
```
