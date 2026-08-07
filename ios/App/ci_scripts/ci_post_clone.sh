#!/bin/sh

# Xcode Cloud — exécuté après le clonage, avant la compilation iOS.
# Le dossier ios/App/App/public/ est gitignoré : il faut donc reconstruire
# les assets web et les synchroniser vers le projet natif, sinon l'app
# se lance sur une WebView vide.

set -e

cd "$CI_PRIMARY_REPOSITORY_PATH"

# Node n'est pas présent par défaut sur les images Xcode Cloud
brew install node
node --version
npm --version

npm ci
npm run build:native
npx cap sync ios
