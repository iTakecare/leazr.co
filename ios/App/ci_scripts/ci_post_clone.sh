#!/bin/sh

# Xcode Cloud — exécuté après le clonage, avant la compilation iOS.
# Le dossier ios/App/App/public/ est gitignoré : il faut donc reconstruire
# les assets web et les synchroniser vers le projet natif, sinon l'app
# se lance sur une WebView vide.

set -e

cd "$CI_PRIMARY_REPOSITORY_PATH"

# Node n'est pas fourni par les images Xcode Cloud
if ! command -v node > /dev/null 2>&1; then
  brew install node
fi
node --version
npm --version

# --legacy-peer-deps : jspdf-autotable@5 déclare un peer jspdf "^2 || ^3" alors
# que le projet est en jspdf 4. La combinaison fonctionne à l'exécution, mais
# npm refuse de résoudre l'arbre sans ce drapeau.
npm ci --legacy-peer-deps

npm run build:native
npx cap sync ios
