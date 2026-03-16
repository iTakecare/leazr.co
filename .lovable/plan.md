

## Supprimer la vérification de numéro de TVA/entreprise du formulaire checkout

### Problème
Le formulaire `CompanyInfoForm` (checkout) oblige à vérifier le numéro d'entreprise via VIES avant de continuer. Le service `verifyVatNumber` n'est même pas implémenté (`console.warn("not implemented yet")`), ce qui bloque systématiquement.

### Plan

**Fichier : `src/components/checkout/CompanyInfoForm.tsx`**

Simplifier le formulaire en supprimant :
- L'import et l'appel à `verifyVatNumber`
- Le state `verifying` et `vatNumberFilled`
- La fonction `handleSearchCompany` (bouton loupe)
- La fonction `handleVerifyVAT` (vérification au submit)
- Le bouton loupe bleue animé et le bandeau bleu "Cliquez sur la loupe"
- La mention "Sera complété automatiquement après vérification"

Garder :
- Les champs : Pays, Numéro d'entreprise (optionnel, simple input), Checkbox TVA exempt, Nom entreprise (requis), Email (requis)
- Le bouton "Continuer" qui appelle directement `onNext()` après validation basique (nom + email remplis)
- Le format helper text sous le numéro d'entreprise

Le submit devient une simple validation : nom d'entreprise et email requis, puis `onNext()`.

