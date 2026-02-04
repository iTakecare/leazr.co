
# Plan : Ajouter un bouton "Envoyer avis Google" dans la carte Actions

## Objectif

Ajouter un bouton "Envoyer avis Google" dans le sidebar d'actions (CompactActionsSidebar) qui ouvre une modale permettant d'envoyer un email au client pour lui demander de laisser un avis sur la fiche Google My Business d'iTakecare.

## Fichiers a creer

### 1. Nouvelle modale : `src/components/offers/detail/SendGoogleReviewModal.tsx`

Creer une modale avec :
- Champ email du destinataire (pre-rempli avec l'email du client)
- Champ email en copie (optionnel)
- Champ objet du mail (pre-rempli)
- Champ corps du message (editeur texte avec template par defaut)
- Bouton d'envoi

Le template par defaut contiendra :
- Un message de remerciement pour la confiance accordee
- Une invitation a laisser un avis Google
- Un bouton/lien vers la fiche Google My Business d'iTakecare

## Fichiers a modifier

### 2. CompactActionsSidebar.tsx

Modifications :
- Ajouter une nouvelle prop `onSendGoogleReview` 
- Ajouter un bouton "Envoyer avis Google" avec une icone etoile (Star)
- Le bouton sera visible uniquement pour les offres aux statuts avances (validated, signed, completed, financed)

### 3. AdminOfferDetail.tsx

Modifications :
- Ajouter un state pour controler l'ouverture de la modale Google Review
- Ajouter l'import du nouveau composant SendGoogleReviewModal
- Passer le handler `onSendGoogleReview` au CompactActionsSidebar
- Rendre la modale dans le JSX

## Details techniques

### Template email par defaut

```
Bonjour {{client_name}},

Nous tenons a vous remercier pour votre confiance dans le cadre de votre projet de leasing informatique avec iTakecare.

Si vous etes satisfait de notre accompagnement, nous serions ravis que vous preniez quelques instants pour partager votre experience en laissant un avis sur notre fiche Google.

[Bouton: Laisser un avis]

Votre retour nous aide a ameliorer nos services et permet a d'autres entreprises de nous decouvrir.

Merci d'avance pour votre temps !

Cordialement,
L'equipe iTakecare
```

### Conditions d'affichage du bouton

Le bouton "Envoyer avis Google" sera affiche uniquement pour les statuts :
- `validated` (offre validee)
- `signed` (offre signee)
- `completed` (offre finalisee)
- `financed` (offre financee)
- `contract_sent` (contrat envoye)

### Flux d'envoi

1. L'utilisateur clique sur "Envoyer avis Google"
2. La modale s'ouvre avec les champs pre-remplis
3. L'utilisateur peut personnaliser le message
4. L'email est envoye via le service `sendEmail` existant
5. Un toast confirme l'envoi

## Resume des modifications

| Fichier | Action |
|---------|--------|
| `src/components/offers/detail/SendGoogleReviewModal.tsx` | Creer |
| `src/components/offers/detail/CompactActionsSidebar.tsx` | Modifier |
| `src/pages/AdminOfferDetail.tsx` | Modifier |

## Remarques

- Le lien Google My Business d'iTakecare devra etre configure (soit en dur dans le code, soit recupere depuis les settings)
- L'envoi utilise le service email existant `sendEmail` de `emailService.ts`
- La modale suit le meme pattern que `SendContractEmailModal.tsx` pour la coherence UI
