

# Plan : Carte "Envoi & Documents" dans le détail d'une demande

## Objectif

Ajouter une nouvelle carte dans la sidebar du détail d'offre, placée juste après la carte "Statut", regroupant les actions d'envoi d'offre et de gestion documentaire — les mêmes fonctionnalités que dans le menu déroulant du listing des demandes.

## Contenu de la carte

La carte "Envoi & Documents" contiendra 4 boutons :

| Action | Icône | Condition d'affichage | Logique |
|---|---|---|---|
| **Générer PDF** | `FileText` | Toujours | Appelle `onGeneratePDF` (déjà passé en prop) |
| **Envoyer offre par mail** | `Mail` | Toujours | Appelle `onSendEmail` (déjà passé en prop) |
| **Ouvrir le lien public** | `ExternalLink` | Toujours | Appelle `onOpenPublicLink` (déjà passé en prop) |
| **Accéder à l'upload docs** | `Upload` | Score interne ou leaser = 'B' | Appelle `onOpenUploadLink` (déjà passé en prop) |

Ces boutons seront **retirés** de la carte "Actions" existante pour éviter la duplication.

## Modifications

### `src/components/offers/detail/CompactActionsSidebar.tsx`

1. Après la carte "Statut" (ligne 223), insérer une nouvelle `Card` "Envoi & Documents" avec les 4 boutons listés ci-dessus, mêmes styles (`size="sm"`, `variant="outline"`, `w-full justify-start text-sm h-8`)
2. Retirer ces 4 boutons de la carte "Actions" (lignes 243-284) pour ne garder dans "Actions" que : Modifier, Supprimer, Classer sans suite, Avis Google, Créer tâche, Réactiver

### Fichier impacté

| Fichier | Modification |
|---|---|
| `src/components/offers/detail/CompactActionsSidebar.tsx` | Nouvelle carte + réorganisation des boutons |

Aucun changement de props nécessaire — toutes les callbacks sont déjà passées au composant.

