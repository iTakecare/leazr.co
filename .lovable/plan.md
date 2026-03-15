

## Plan : Améliorer le prompt de génération hero pour refléter la description

### Problème actuel
Le prompt actuel génère des images génériques (fond bleu-teal avec motifs géométriques) sans vraiment exploiter le contenu de la description du partenaire. La description est mentionnée en passant mais le style imposé ("blue-teal tones, geometric patterns") écrase tout contexte métier.

### Solution
Réécrire le prompt dans `supabase/functions/generate-partner-hero/index.ts` pour que la description du partenaire soit le sujet principal de l'image, pas juste un détail secondaire.

### Nouveau prompt (ligne 28-29)
Le prompt sera restructuré pour :
- Analyser la description du partenaire et en faire le thème visuel principal
- Représenter visuellement le secteur d'activité, les services ou produits décrits
- Garder le style professionnel et bannière 16:9 sans texte
- Utiliser la palette bleu-teal comme accent, pas comme contrainte principale

Exemple de nouveau prompt :
```
Create a professional hero banner image (16:9 ratio) for a business partner page.
Partner: "{partner_name}".
The image MUST visually represent the following description: "{partner_description}".
Create a scene or illustration that directly relates to the partner's activity, services, or industry described above.
Style: Modern, professional, high quality. Use a color palette that fits the described activity, with blue-teal (#33638e, #4ab6c4) as accent colors.
Do NOT include any text in the image. Polished, clean aesthetic.
```

### Fichier modifié
| Fichier | Action |
|---------|--------|
| `supabase/functions/generate-partner-hero/index.ts` | Réécrire le prompt (lignes 28-29) |

Redéployer la fonction `generate-partner-hero` après modification.

