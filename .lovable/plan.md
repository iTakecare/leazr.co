

# Correction : Supprimer le bouton "Fermer" de la carte SEPA

## Problème identifié

Dans le composant `MollieSepaCard.tsx`, à la ligne 532-534, il y a un bouton "Fermer" qui n'a pas lieu d'être :

```tsx
<Button variant="ghost" onClick={() => { setSuccess(false); setIsOpen(false); }}>
  Fermer
</Button>
```

Ce bouton est inapproprié car :
- La carte SEPA est affichée dans la page du contrat, pas dans un dialogue
- Cliquer sur "Fermer" réinitialise l'état `success` à `false`, ce qui masque les informations SEPA configurées
- L'utilisateur n'a aucune raison de vouloir "fermer" cette carte

## Modification à effectuer

Fichier : `src/components/contracts/MollieSepaCard.tsx`

Supprimer les lignes 532-534 contenant le bouton "Fermer".

**Avant :**
```tsx
<div className="text-sm text-muted-foreground">
  <p><strong>Client :</strong> {contract.client_name || `${formData.prenom} ${formData.nom}`}</p>
</div>

<Button variant="ghost" onClick={() => { setSuccess(false); setIsOpen(false); }}>
  Fermer
</Button>

{/* Dialog for editing payment day */}
```

**Après :**
```tsx
<div className="text-sm text-muted-foreground">
  <p><strong>Client :</strong> {contract.client_name || `${formData.prenom} ${formData.nom}`}</p>
</div>

{/* Dialog for editing payment day */}
```

## Résultat attendu

La carte SEPA affiche les informations du prélèvement configuré sans bouton "Fermer" superflu.

