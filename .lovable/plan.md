
# Fix: Caractere U+2011 non supporté par pdf-lib

## Cause racine

Les logs de l'edge function montrent cette erreur :
```
WinAnsi cannot encode "‑" (0x2011)
```

Le contenu des blocs de texte du contrat (`pdf_content_blocks`) contient des **tirets insecables** (U+2011 `‑`) dans plusieurs articles (article_2, article_3, article_5, article_6, article_10, article_11). La bibliotheque `pdf-lib` utilise l'encodage WinAnsi pour les polices standard (Helvetica), qui ne supporte pas ce caractere.

Ce contrat a ete signe le 13 fevrier 2026. Le PDF n'a jamais ete genere et stocke (`signed_contract_pdf_url = NULL`), probablement parce que la generation a echoue silencieusement a ce moment-la aussi, ou que les blocs de contenu ont ete modifies apres la signature.

## Solution

Ajouter une fonction `sanitizeForWinAnsi()` dans l'edge function `generate-signed-contract-pdf/index.ts` qui remplace tous les caracteres non supportes par leurs equivalents ASCII avant de les passer aux fonctions de dessin PDF.

## Fichier modifie

**`supabase/functions/generate-signed-contract-pdf/index.ts`**

1. Ajouter une fonction `sanitizeForWinAnsi(text)` qui remplace :
   - U+2011 (tiret insecable) par `-` (tiret normal)
   - U+2013 (tiret demi-cadratin) par `-`
   - U+2014 (tiret cadratin) par `--`
   - U+2018/U+2019 (guillemets simples) par `'`
   - U+201C/U+201D (guillemets doubles) par `"`
   - U+2026 (points de suspension) par `...`
   - U+00A0 (espace insecable) par ` `
   - U+202F (espace fine insecable) par ` `
   - U+00AB/U+00BB (guillemets francais) par `"` (ces derniers sont supportes par WinAnsi, mais au cas ou)
   - Autres caracteres non-WinAnsi courants

2. Appeler `sanitizeForWinAnsi()` dans les fonctions `stripHtml()` (a la fin, avant le return) et `replacePlaceholders()` (a la fin, avant le return) pour nettoyer tout le texte avant qu'il ne soit passe a `pdf-lib`.

## Impact

- Corrige l'erreur "WinAnsi cannot encode" pour ce contrat et tous les futurs contrats contenant des caracteres speciaux
- Aucun changement visuel significatif dans le PDF (les tirets insecables deviennent des tirets normaux)
- Aucun autre fichier modifie
- L'erreur de build Dexie pre-existante n'est pas liee a ce changement

## Note sur le build error Dexie

L'erreur TypeScript `dexie.d.ts` est un probleme pre-existant dans les types de la dependance `dexie` et n'est pas liee a ce correctif. Elle n'affecte pas le fonctionnement de l'application.
