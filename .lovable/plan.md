
# Ameliorations du systeme de taches -- Phase 2 ✅ DONE

Toutes les améliorations ont été implémentées. Voir les fichiers sources pour les détails.

## Résumé des changements

1. ✅ Migration SQL : tables task_subtasks, task_tags, task_tag_assignments, task_templates + colonnes recurrence sur tasks
2. ✅ Filtrage profils assignables (exclut ambassadors/clients)
3. ✅ Autocomplétion client (ClientSearchInput.tsx) + sélecteurs contrat/offre dynamiques
4. ✅ Sous-tâches avec checklist (TaskSubtasks.tsx)
5. ✅ Tags personnalisables (TaskTagManager.tsx) + filtre par tag
6. ✅ Commentaires avec @mentions (TaskComments.tsx)
7. ✅ Modèles de tâches (TaskTemplateDialog.tsx)
8. ✅ Vue calendrier (TaskCalendar.tsx)
9. ✅ Récurrence (logique dans useTasks.ts)
10. ✅ Rappels automatiques (edge function task-reminders)
