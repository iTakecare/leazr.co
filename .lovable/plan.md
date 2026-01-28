
# Plan : Ajouter un bouton retour vers la demande depuis la fiche client

## Problème

Quand vous naviguez depuis une demande vers la fiche client via "Voir la fiche client", le seul bouton retour disponible ramène à la liste des clients, pas à la demande d'origine.

```text
[Demande #123] → [Fiche Client] → ❌ [Liste Clients]
                                  ✅ [Demande #123] (souhaité)
```

## Solution

Passer un paramètre d'origine dans l'URL (`?from=offer&offerId=XXX`) pour permettre au client de revenir à la demande source.

## Fichiers à Modifier

| Fichier | Modification |
|---------|--------------|
| `src/components/offers/detail/ClientSection.tsx` | Ajouter `?from=offer&offerId=XXX` au lien |
| `src/pages/ClientDetail.tsx` | Détecter le paramètre et afficher un bouton retour conditionnel |

## Modifications Détaillées

### 1. ClientSection.tsx - Passer l'origine dans l'URL

**Avant** (ligne 76) :
```tsx
<Link to={`/${companySlug}/admin/clients/${offer.client_id}`}>
```

**Après** :
```tsx
<Link to={`/${companySlug}/admin/clients/${offer.client_id}?from=offer&offerId=${offer.id}`}>
```

### 2. ClientDetail.tsx - Bouton retour intelligent

**Modifications** :

a) Lire les paramètres `from` et `offerId` depuis l'URL (ligne 17) :
```tsx
const fromOffer = searchParams.get('from') === 'offer';
const sourceOfferId = searchParams.get('offerId');
```

b) Remplacer le bouton retour (lignes 149-154) :
```tsx
<div className="mb-6 flex gap-2">
  {fromOffer && sourceOfferId ? (
    <>
      <Button 
        variant="default" 
        onClick={() => navigateToAdmin(`offers/${sourceOfferId}`)}
      >
        <ChevronLeft className="mr-1 h-4 w-4" />
        Retour à la demande
      </Button>
      <Button 
        variant="outline" 
        onClick={() => navigateToAdmin("clients")}
      >
        Voir tous les clients
      </Button>
    </>
  ) : (
    <Button 
      variant="outline" 
      onClick={() => navigateToAdmin("clients")}
    >
      <ChevronLeft className="mr-1 h-4 w-4" />
      Retour à la liste
    </Button>
  )}
</div>
```

## Comportement Final

### Depuis une demande :
```text
URL: /company/admin/clients/abc?from=offer&offerId=123

┌─────────────────────────────────────────────────┐
│ [← Retour à la demande]  [Voir tous les clients]│
│                                                 │
│ Fiche client : Jean Dupont                      │
│ ...                                             │
└─────────────────────────────────────────────────┘
```

### Depuis la liste des clients (comportement inchangé) :
```text
URL: /company/admin/clients/abc

┌─────────────────────────────────────────────────┐
│ [← Retour à la liste]                           │
│                                                 │
│ Fiche client : Jean Dupont                      │
│ ...                                             │
└─────────────────────────────────────────────────┘
```

## Avantages

- Préserve le contexte de navigation
- Propose les deux options (retour demande ET accès liste clients)
- Le bouton principal (bleu) est le retour à la demande
- Pas de changement pour les autres flux de navigation
