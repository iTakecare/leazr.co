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
Phase 6 complétée - Interface de gestion dans les paramètres
- ✅ Onglet "Templates PDF" ajouté dans les paramètres
- ✅ Interface avec 2 sous-onglets : Test et Templates
- ✅ Composant `PdfTemplateSettings` créé
- ✅ Informations détaillées sur le template iTakecare v1
- ✅ Interface de test intégrée

## Phases complètes
- ✅ Phase 1: Infrastructure Edge Function
- ✅ Phase 2: Template HTML iTakecare v1
- ✅ Phase 3: Génération PDF réelle avec Puppeteer
- ✅ Phase 4: Intégration frontend (appel + téléchargement)
- ✅ Phase 5: Test et validation
- ✅ Phase 6: Interface de gestion dans les paramètres

## Accès aux interfaces
- Interface de test : `/:companySlug/admin/pdf-test`
- Gestion complète : `/:companySlug/admin/settings` > Onglet "Templates PDF"

Exemple : `/itakecare/admin/settings`

## Utilisation complète

### Depuis le frontend
```typescript
import { downloadOfferPdf, previewOfferPdf } from "@/services/pdfService";

// Télécharger le PDF
await downloadOfferPdf(offerId, 'Mon-Offre.pdf', 'itakecare-v1');

// Prévisualiser le PDF
await previewOfferPdf(offerId, 'itakecare-v1');
```

### Disponible dans les hooks
Le hook `useOffers` expose `handleGenerateOffer` qui télécharge automatiquement le PDF.
