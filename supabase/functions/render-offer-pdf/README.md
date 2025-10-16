# Render Offer PDF - Edge Function

## Description
Edge function pour générer des PDFs d'offres avec des templates HTML personnalisables.

## Structure
```
render-offer-pdf/
├── index.ts                 # Point d'entrée principal
├── data-fetcher.ts          # Récupération des données d'offre
├── template-loader.ts       # Chargement des templates HTML
├── template-compiler.ts     # Compilation Handlebars
├── pdf-generator.ts         # Génération PDF (Playwright)
├── templates/              
│   └── itakecare-v1.html   # Template iTakecare officiel
└── README.md
```

## Usage

### Appel depuis le frontend
```typescript
const { data, error } = await supabase.functions.invoke('render-offer-pdf', {
  body: { 
    offerId: 'uuid-de-l-offre',
    templateSlug: 'itakecare-v1' // optionnel
  }
});
```

### Variables disponibles
Voir `templates/itakecare-v1.html` pour la liste complète des variables.

## Template iTakecare v1

### Pages
1. Couverture
2. Vision + Présentation
3. Notre Solution (équipements + totaux)
4. Nos Valeurs
5. Comment ça fonctionne + Témoignages
6. Modalités du leasing
7. Contact + Signature

### Couleurs
- Primary: #33638e
- Secondary: #4ab6c4
- Accent: #da2959

### Police
- Carlito (Google Fonts)

## Phase actuelle
Phase 3 complétée - Génération PDF avec Puppeteer implémentée
- ✅ Puppeteer configuré pour Deno Deploy
- ✅ Conversion HTML vers PDF A4
- ✅ Support des marges configurables
- ✅ Gestion des ressources (fonts, images)

## Phases
- ✅ Phase 1: Infrastructure Edge Function
- ✅ Phase 2: Template HTML iTakecare v1
- ✅ Phase 3: Génération PDF réelle avec Puppeteer
- 🔄 Phase 4: Intégration frontend (appel + téléchargement)
