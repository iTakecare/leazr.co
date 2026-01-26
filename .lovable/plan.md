

# Plan : Supprimer le Hamburger Menu pour une vraie experience PWA

## Probleme Identifie

Le `MobileHeader.tsx` actuel contient un menu hamburger (lignes 59-129) qui :
- N'est pas typique d'une PWA avec bottom navigation
- Duplique les fonctionnalites deja presentes dans la bottom nav (Profil → Parametres)
- Donne un aspect "site web responsive" plutot qu'application native

## Solution

Modifier `MobileHeader.tsx` pour supprimer completement le menu hamburger et creer un header minimaliste type application mobile :

### Nouveau Design du Header

```text
+--------------------------------------------------+
|                    LEAZR                    🔔 🔍 |
+--------------------------------------------------+
         (logo centre, actions a droite)
```

- **Supprimer** : Menu hamburger (Sheet + Menu icon)
- **Garder** : Logo/titre centre
- **Garder** : Notifications et recherche a droite
- **Optionnel** : Scanner document (peut etre deplace vers un FAB ou bottom sheet)

### Fichier a Modifier

**`src/components/mobile/MobileHeader.tsx`**

Changements :
1. Supprimer l'import de `Menu`, `Sheet`, `SheetContent`, `SheetTrigger`
2. Supprimer tout le bloc `<Sheet>` (lignes 59-129)
3. Supprimer les items de menu qui sont deja dans la bottom nav
4. Garder uniquement : logo centre + icones notifications/recherche a droite
5. Optionnel : Ajouter le scanner comme icone a gauche si necessaire

### Code Simplifie

```typescript
return (
  <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border safe-top">
    <div className="flex items-center justify-between h-14 px-4">
      {/* Left side - Spacer ou Scanner */}
      <div className="w-10">
        {showScanner && (
          <button onClick={onScannerClick} aria-label="Scanner">
            <Camera className="h-5 w-5 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Center - Logo/Title */}
      <div className="flex-1 flex items-center justify-center">
        {title ? (
          <h1 className="font-semibold text-base">{title}</h1>
        ) : logoUrl ? (
          <img src={logoUrl} alt={companyName} className="h-7" />
        ) : (
          <span className="font-bold text-lg text-primary">{companyName}</span>
        )}
      </div>

      {/* Right side - Notifications & Search */}
      <div className="flex items-center gap-2">
        {showNotifications && (
          <button onClick={() => navigate('/notifications')} aria-label="Notifications">
            <Bell className="h-5 w-5 text-muted-foreground" />
            {notificationCount > 0 && <badge>...</badge>}
          </button>
        )}
        {showSearch && (
          <button onClick={onSearchClick} aria-label="Rechercher">
            <Search className="h-5 w-5 text-muted-foreground" />
          </button>
        )}
      </div>
    </div>
  </header>
);
```

### Navigation Conservee

Les fonctionnalites du menu hamburger sont deja couvertes par la bottom nav :
- **Parametres** → Onglet "Profil" dans bottom nav
- **Mon profil** → Onglet "Profil" dans bottom nav  
- **Deconnexion** → Sera accessible depuis la page Profil/Parametres

### Resultat Attendu

L'application aura l'apparence d'une vraie PWA/application mobile :
- Header epure avec logo centre
- Actions rapides (notifications, recherche) a droite
- Navigation principale via bottom nav
- Plus de menu hamburger visible

