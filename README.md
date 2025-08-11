# iTakecare Catalog - Plateforme de Gestion avec Impact Environnemental

Plateforme complète de gestion de catalogues produits avec calcul automatique d'économies CO2 et impact environnemental.

## Fonctionnalités Environnementales

### 🌱 Calcul d'impact CO2 en temps réel
- **16 catégories** pré-configurées avec données environnementales réelles
- **Calcul automatique** des économies carbone par produit/pack
- **Équivalences visuelles** : distance en voiture, absorption d'arbres
- **Sources multiples** : Base de données propriétaire + fallback impactco2.fr

### 📊 Données environnementales disponibles
| Catégorie | CO2 économisé | Source |
|-----------|---------------|---------|
| Serveurs | 300 kg | Database |
| Laptops/Desktops | 170 kg | Database |
| Tablettes | 87 kg | Database |
| Écrans | 85 kg | Database |
| Smartphones | 45 kg | Database |

### 🛠️ Interface d'administration
- **Onglet Environnement** intégré à la gestion du catalogue
- **Modification en temps réel** des valeurs CO2
- **Gestion des sources** de données environnementales
- **Visualisation** données réelles vs estimées

## Documentation Technique

- 📖 [API Environnementale](docs/environmental-api.md) - Endpoints et services CO2
- 🧩 [Composants CO2](docs/co2-components.md) - Composants React et hooks
- 🔧 [Guide d'intégration](catalog-skeleton/integration-guide.txt) - Configuration personnalisée

## Project info

**URL**: https://lovable.dev/projects/ad498fde-39d4-4047-b0b8-05fb528da9c9

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/ad498fde-39d4-4047-b0b8-05fb528da9c9) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with .

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/ad498fde-39d4-4047-b0b8-05fb528da9c9) and click on Share -> Publish.

## I want to use a custom domain - is that possible?

We don't support custom domains (yet). If you want to deploy your project under your own domain then we recommend using Netlify. Visit our docs for more details: [Custom domains](https://docs.lovable.dev/tips-tricks/custom-domain/)
