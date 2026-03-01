

# Correction de la detection de doublons a l'import du stock

## Probleme identifie

La detection de doublons utilise une empreinte composite `titre|marque|modele` pour les articles sans numero de serie. Or, il est parfaitement normal d'avoir plusieurs exemplaires du meme article (ex: 5 "Lenovo V15 G4" avec la marque "Lenovo" et sans modele specifie). Le systeme considere a tort qu'un nouvel article avec le meme titre/marque/modele est un doublon, alors qu'il s'agit d'un equipement supplementaire.

Par exemple dans la base actuelle, il y a deja plusieurs "Lenovo V15 G4" sans numero de serie. Tout import d'un nouveau "Lenovo V15 G4" sans SN sera donc bloque.

## Solution

Remplacer la logique de deduplication par empreinte Set (qui empeche tout doublon titre|marque|modele) par une logique de **comptage** :

1. Compter combien d'exemplaires de chaque empreinte existent deja en base
2. Compter combien d'exemplaires de chaque empreinte sont dans le fichier d'import
3. Ne marquer comme doublon que si le nombre total (base + fichier) depasse ce qui est attendu

Concretement, pour les articles **sans numero de serie** :
- Compter les occurrences de chaque fingerprint dans la base existante (Map au lieu de Set)
- Compter les occurrences de chaque fingerprint dans le fichier d'import
- Chaque occurrence dans le fichier est autorisee (ce sont des equipements supplementaires)
- Seule la deduplication **intra-fichier** est maintenue (eviter d'importer 2 fois le meme fichier)

Pour les articles **avec numero de serie** : la logique reste inchangee (un SN est unique par definition).

## Deduplication intra-fichier revisee

Pour eviter la reimportation du meme fichier, on verifie si le nombre d'articles avec la meme empreinte en base est deja >= au nombre dans le fichier. Si oui, c'est une reimportation.

## Fichier modifie

| Fichier | Changement |
|---|---|
| `src/services/stockImportService.ts` | Remplacer `existingFingerprints` (Set) par un Map de comptage, ajuster la logique de deduplication pour permettre les multiples exemplaires |

## Detail technique

### Changement dans la section de chargement des doublons (lignes 385-403)

Remplacer :
```typescript
const existingFingerprints = new Set<string>();
```
Par :
```typescript
const existingFingerprintCounts = new Map<string, number>();
const importFingerprintCounts = new Map<string, number>();
```

Compter les occurrences en base au lieu d'un simple add dans un Set.

### Changement dans la boucle d'import (lignes 432-439)

Remplacer la verification `existingFingerprints.has(fingerprint)` par :
- Compter combien de fois ce fingerprint apparait dans le fichier (premiere passe ou comptage incremental)
- Compter combien existent deja en base
- Si `existingCount >= importCountSoFar` pour ce fingerprint, c'est un doublon (reimportation)
- Sinon, c'est un nouvel exemplaire a importer

### Pre-comptage des fingerprints du fichier

Avant la boucle d'import, faire une premiere passe sur toutes les lignes pour compter les fingerprints du fichier. Ensuite dans la boucle principale, consommer progressivement ce comptage.

