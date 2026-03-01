
# Correction de la detection de doublons - suppression du fingerprint sans SN

## Probleme

La logique de comptage par fingerprint (`titre|marque|modele`) bloque toujours l'import des articles sans numero de serie. Exemple : la base contient deja 4 "Lenovo V15 G4" sans SN. Le fichier d'import en contient 2. La condition `existingCount(4) >= importTotal(2)` est vraie, donc les 25 articles sont marques comme doublons.

## Solution

Supprimer entierement la detection de doublons par fingerprint pour les articles sans numero de serie. Seuls les numeros de serie sont un critere de doublon fiable. Les articles sans SN sont des equipements fongibles dont il est normal d'ajouter plusieurs exemplaires.

## Fichier modifie

| Fichier | Changement |
|---|---|
| `src/services/stockImportService.ts` | Supprimer le Map de fingerprints, le pre-comptage, et la verification fingerprint dans la boucle d'import |

## Detail technique

### Suppressions (lignes 386-425)

Supprimer :
- `existingFingerprintCounts` (Map, ligne 387)
- Le comptage des fingerprints dans la boucle des items existants (lignes 396-404)
- `importFingerprintTotals` et sa boucle de pre-comptage (lignes 407-422)
- `importFingerprintProcessed` (ligne 425)

Conserver uniquement :
- `existingSerials` (Set) pour la detection par numero de serie
- La fonction `buildFingerprint` peut aussi etre supprimee

### Suppressions dans la boucle d'import (lignes 454-474)

Supprimer tout le bloc de detection par fingerprint (lignes 454-474). Seul le bloc de detection par numero de serie (lignes 447-452) est conserve.

### Resultat attendu

- Les articles avec SN sont dedupliques normalement (un SN = un article unique)
- Les articles sans SN sont toujours importes comme nouveaux exemplaires
- La reimportation du meme fichier creera effectivement des doublons, mais c'est preferable a bloquer les imports legitimes
