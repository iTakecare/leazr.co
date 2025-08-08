# Guide d'intégration embed pour iTakecare

## Comment intégrer le catalogue Leazr dans votre site iTakecare

### 1. Intégration iframe

```html
<iframe
  src="https://votre-domaine-leazr.com/company-slug/catalog?embed=1&parentOrigin=https://votre-site-itakecare.com"
  width="100%"
  height="600"
  frameborder="0"
  id="leazr-catalog-embed">
</iframe>
```

### 2. Écouter les événements du panier

```javascript
// Écouter les mises à jour du panier
window.addEventListener('message', function(event) {
  // Vérifiez l'origine pour la sécurité
  if (event.origin !== 'https://votre-domaine-leazr.com') return;
  
  if (event.data.type === 'leazr:cartUpdate') {
    const cartCount = event.data.count;
    console.log('Nombre d\'articles dans le panier:', cartCount);
    
    // Mettre à jour votre badge de panier
    updateCartBadge(cartCount);
  }
  
  if (event.data.type === 'leazr:ready') {
    console.log('Le catalogue Leazr est prêt');
  }
});

function updateCartBadge(count) {
  const cartBadge = document.querySelector('#cart-badge');
  if (cartBadge) {
    cartBadge.textContent = count;
    cartBadge.style.display = count > 0 ? 'block' : 'none';
  }
}
```

### 3. Structure des événements postMessage

#### Événement de mise à jour du panier
```javascript
{
  type: 'leazr:cartUpdate',
  count: number  // Nombre total d'articles dans le panier
}
```

#### Événement de prêt
```javascript
{
  type: 'leazr:ready'
  // Émis quand l'embed est complètement chargé
}
```

### 4. Paramètres d'URL supportés

- `embed=1` : Active le mode embed (masque l'en-tête)
- `parentOrigin` : L'origine du site parent pour sécuriser les communications postMessage

### 5. Exemple complet d'intégration

```html
<!DOCTYPE html>
<html>
<head>
    <title>iTakecare - Catalogue</title>
    <style>
        .cart-badge {
            background: #f56565;
            color: white;
            border-radius: 50%;
            padding: 4px 8px;
            font-size: 12px;
            position: absolute;
            top: -8px;
            right: -8px;
            display: none;
        }
        .cart-icon {
            position: relative;
            display: inline-block;
        }
    </style>
</head>
<body>
    <nav>
        <div class="cart-icon">
            🛒 Panier
            <span id="cart-badge" class="cart-badge">0</span>
        </div>
    </nav>
    
    <iframe
        src="https://votre-domaine-leazr.com/company-slug/catalog?embed=1&parentOrigin=https://votre-site-itakecare.com"
        width="100%"
        height="600"
        frameborder="0"
        id="leazr-catalog">
    </iframe>

    <script>
        window.addEventListener('message', function(event) {
            if (event.origin !== 'https://votre-domaine-leazr.com') return;
            
            if (event.data.type === 'leazr:cartUpdate') {
                const cartBadge = document.querySelector('#cart-badge');
                const count = event.data.count;
                
                cartBadge.textContent = count;
                cartBadge.style.display = count > 0 ? 'block' : 'none';
                
                // Optionnel : animation
                if (count > 0) {
                    cartBadge.style.animation = 'pulse 0.3s';
                    setTimeout(() => cartBadge.style.animation = '', 300);
                }
            }
            
            if (event.data.type === 'leazr:ready') {
                console.log('Catalogue Leazr chargé et prêt');
            }
        });
    </script>
</body>
</html>
```

### 6. Sécurité

- Toujours vérifier l'origine (`event.origin`) lors de l'écoute des messages
- Utiliser HTTPS pour tous les échanges
- Le paramètre `parentOrigin` permet de restreindre les communications à votre domaine uniquement

### 7. Responsive

L'iframe s'adaptera automatiquement à la taille de son conteneur. Vous pouvez ajuster les dimensions selon vos besoins :

```css
#leazr-catalog {
    width: 100%;
    height: 80vh;
    min-height: 600px;
    border: none;
    border-radius: 8px;
}
```