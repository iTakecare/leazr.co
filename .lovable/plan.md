

## Plan : Ajouter version et date aux fichiers de documentation API

### Problème
Les fichiers de documentation `catalog-skeleton/partners-api.txt` et `catalog-skeleton/types-partners.txt` n'ont ni numéro de version ni date de dernière mise à jour. Aucun fichier du skeleton n'en a actuellement.

### Solution
Ajouter un en-tête de versioning aux deux fichiers modifiés récemment (partners) :

**`catalog-skeleton/partners-api.txt`** — Ajouter après le titre (ligne 1) :
```
> Version : 1.1.0 | Dernière mise à jour : 2026-03-15
> Changelog : Ajout du champ `hero_image_url` sur les partenaires
```

**`catalog-skeleton/types-partners.txt`** — Ajouter après le titre (ligne 1) :
```
> Version : 1.1.0 | Dernière mise à jour : 2026-03-15
> Changelog : Ajout de `hero_image_url` dans l'interface Partner
```

### Fichiers modifiés
| Fichier | Action |
|---------|--------|
| `catalog-skeleton/partners-api.txt` | Ajouter en-tête version + date |
| `catalog-skeleton/types-partners.txt` | Ajouter en-tête version + date |

