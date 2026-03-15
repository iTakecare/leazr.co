

## Problème identifié

Deux URLs cassées — il manque le slug company (`itakecare`) dans le chemin :

### 1. Notification click (`AdminNotificationBadge.tsx`, ligne 24)
```
// Actuel (cassé) :
navigate(`/admin/offers/${notification.offer_id}`)
// Attendu :
navigate(`/${companySlug}/admin/offers/${notification.offer_id}`)
```

### 2. Lien email admin (`create-product-request/index.ts`, ligne 756)
```
// Actuel (cassé) :
adminLink: `${getAppUrl(req)}/offers/${requestId}`
// Attendu :
adminLink: `${getAppUrl(req)}/${companySlug}/admin/offers/${requestId}`
```

## Corrections

### Fichier 1 : `src/components/admin/AdminNotificationBadge.tsx`
- Importer `useParams` et extraire `companySlug`
- Ligne 24 : changer `navigate('/admin/offers/...')` → `navigate('/${companySlug}/admin/offers/...')`

### Fichier 2 : `supabase/functions/create-product-request/index.ts`
- Ligne 632-633 : ajouter `slug` au SELECT de la requête companies → `.select('name, logo_url, slug')`
- Ligne 756 : construire le lien admin avec le slug → `` `${getAppUrl(req)}/${companyInfo?.slug || 'itakecare'}/admin/offers/${requestId}` ``

Deux modifications simples, le reste du code ne change pas.

