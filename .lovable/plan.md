
# Fix: PDF du contrat signe et erreur de chargement

## Probleme 1 : "Failed to fetch" sur le PDF

**Cause racine** : L'edge function `generate-signed-contract-pdf` utilise `PDFKit` importe via `esm.sh`. PDFKit est une bibliotheque Node.js qui depend de modules natifs (`stream`, `zlib`, `fs`, `crypto`). Ces modules ne sont pas disponibles dans l'environnement Deno des Edge Functions Supabase, ce qui fait crasher la fonction au moment de l'import -- avant meme que le moindre log ne soit ecrit.

**Solution** : Remplacer `pdfkit` par `pdf-lib` dans l'edge function. `pdf-lib` est une bibliotheque 100% JavaScript qui fonctionne nativement dans Deno sans aucune dependance Node.js.

### Fichier modifie

`supabase/functions/generate-signed-contract-pdf/index.ts`

- Remplacer l'import `pdfkit` par `pdf-lib` (via `https://esm.sh/pdf-lib@1.17.1`)
- Reecrire la generation du PDF en utilisant l'API de `pdf-lib` :
  - Creer le document avec `PDFDocument.create()`
  - Utiliser les fonts embarquees Helvetica (standard PDF)
  - Recreer les memes sections : header, tableau des equipements, resume financier, conditions, page de signature
  - Inclure la signature client (image base64) via `doc.embedPng()`
  - Inclure la signature du bailleur (fetch de l'URL et embed)
- Conserver toute la logique metier existante (fetch contract, equipment, leaser, content blocks, placeholder replacement)
- Conserver les deux modes `download` (retourne le PDF binaire) et `upload` (stocke dans le bucket)

### Approche technique

```text
pdf-lib API pattern:
  const doc = await PDFDocument.create();
  const page = doc.addPage(PageSizes.A4);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  page.drawText('...', { x, y, font, size });
  page.drawRectangle({ x, y, width, height, color });
  // Pour les images signatures :
  const img = await doc.embedPng(base64Data);
  page.drawImage(img, { x, y, width, height });
  const pdfBytes = await doc.save();
```

## Probleme 2 : "Erreur lors du chargement" (toast)

Ce toast provient du composant `EquipmentOrderTracker.tsx` (ligne 87). Il s'affiche quand le chargement des donnees de commande echoue. D'apres les requetes reseau, la requete `contract_equipment` retourne bien des donnees (status 200), donc cette erreur est probablement intermittente ou liee a une condition de course.

**Action** : Ajouter des logs console supplementaires dans le `fetchData` du `EquipmentOrderTracker` pour identifier precisement l'erreur sous-jacente (quel appel echoue et pourquoi).

### Fichier modifie

`src/components/contracts/EquipmentOrderTracker.tsx`

- Dans le bloc `catch` de `fetchData`, logger l'erreur complete pour faciliter le diagnostic
- Rendre le message de toast plus specifique pour distinguer les differentes causes

## Resume des changements

| Fichier | Action |
|---|---|
| `supabase/functions/generate-signed-contract-pdf/index.ts` | Remplacer pdfkit par pdf-lib, reecrire la generation PDF |
| `src/components/contracts/EquipmentOrderTracker.tsx` | Ameliorer les logs d'erreur dans fetchData |

## Impact

- Aucun changement cote client (`signedContractPdfService.tsx` reste identique)
- Le PDF genere aura le meme contenu et la meme structure visuelle
- La fonction sera compatible avec l'environnement Deno des Edge Functions
