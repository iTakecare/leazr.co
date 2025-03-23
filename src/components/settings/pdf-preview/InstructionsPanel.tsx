
import React from "react";

const InstructionsPanel: React.FC = () => {
  return (
    <div className="text-sm text-muted-foreground">
      <p>Pour positionner les champs sur vos pages:</p>
      <ol className="list-decimal list-inside ml-4 space-y-1 mt-2">
        <li>Cliquez sur "Positionner les champs" pour activer le mode d'édition</li>
        <li>Déplacez les champs en les faisant glisser à l'emplacement souhaité</li>
        <li>Un bouton "Sauvegarder les positions" apparaîtra quand vous aurez fait des modifications</li>
        <li>Cliquez sur "Sauvegarder les positions" pour enregistrer vos changements</li>
        <li>Cliquez sur "Terminer le positionnement" pour quitter le mode d'édition</li>
      </ol>
      <p className="mt-2 font-medium text-blue-600">Note: Les positions des champs ne seront sauvegardées que lorsque vous cliquez sur le bouton "Sauvegarder les positions".</p>
    </div>
  );
};

export default InstructionsPanel;
