

# Ajout de 2 onglets "En cours" / "Terminées" dans la page Tâches

## Modification

**Fichier unique** : `src/pages/admin/Tasks.tsx`

Ajouter un composant `Tabs` avec deux onglets :
- **En cours** : affiche les tâches avec statut `todo` ou `in_progress`
- **Terminées** : affiche les tâches avec statut `done`

### Fonctionnement

- Les tâches récupérées par `useTasks(filters)` sont filtrées côté client selon l'onglet actif
- L'onglet "En cours" est sélectionné par défaut
- Les filtres, vues (Liste/Kanban/Calendrier) et actions restent identiques dans chaque onglet
- Un badge sur l'onglet "Terminées" affiche le nombre de tâches terminées

### Structure

```text
Tâches (header + boutons)
├── Tabs
│   ├── TabsTrigger "En cours" (count)
│   └── TabsTrigger "Terminées" (count)
├── TaskFilters
└── Content (TaskList / TaskKanban / TaskCalendar)
    └── filtré selon l'onglet actif
```

### Détail technique

- Importer `Tabs, TabsList, TabsTrigger` depuis `@/components/ui/tabs`
- Ajouter un state `activeTab` (`'active' | 'done'`)
- Filtrer les tâches : `tasks.filter(t => activeTab === 'done' ? t.status === 'done' : t.status !== 'done')`
- Passer les tâches filtrées aux composants de vue existants

