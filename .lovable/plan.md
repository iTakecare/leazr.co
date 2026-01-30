
# Ajout de GoCardless dans IntegrationsManager

## Problème identifié

L'intégration GoCardless a été ajoutée dans `CompanySettingsPage.tsx`, mais vous êtes sur la page `/itakecare/admin/settings` qui utilise le composant `IntegrationsManager.tsx` - un écran différent qui liste toutes les intégrations par catégories.

## Solution

Ajouter GoCardless dans `IntegrationsManager.tsx` avec une nouvelle catégorie **"Paiements"**.

---

## Modifications à effectuer

### Fichier: `src/components/settings/IntegrationsManager.tsx`

**1. Importer le composant GoCardlessIntegrationCard**

Ajout de l'import en haut du fichier.

**2. Ajouter l'intégration GoCardless dans la liste**

Nouvelle entrée dans le tableau `integrations` :

```text
{
  id: 'gocardless',
  name: 'GoCardless',
  description: 'Prélèvements SEPA automatiques pour vos contrats de leasing',
  logoUrl: 'https://logo.clearbit.com/gocardless.com',
  status: 'available',
  category: 'Paiements'
}
```

**3. Ajouter l'icône pour la catégorie "Paiements"**

Dans la fonction `getCategoryIcon`, ajouter :

```text
case 'Paiements':
  return <CreditCard className="h-6 w-6 text-blue-600" />;
```

**4. Ajouter le rendu conditionnel dans le Dialog**

Quand `selectedIntegration === 'gocardless'`, afficher `GoCardlessIntegrationCard`.

---

## Résultat attendu

Une nouvelle section **"Paiements"** apparaîtra dans l'écran Intégrations avec une carte GoCardless :
- Logo GoCardless
- Badge "Disponible"
- Bouton "Configurer" qui ouvre le panneau de configuration avec diagnostics

---

## Fichiers impactés

| Fichier | Action |
|---------|--------|
| `src/components/settings/IntegrationsManager.tsx` | Modifier (ajout de GoCardless) |

Aucun autre fichier à modifier - le composant `GoCardlessIntegrationCard` existe déjà.
