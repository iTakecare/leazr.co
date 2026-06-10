import { createContext, useContext } from "react";

// True quand un écran admin est rendu DANS la colonne étroite du Centre
// d'appels (EmbeddedAdminView), par opposition à la pleine page. Les
// composants comme le stepper de workflow s'en servent pour passer en mode
// compact — de façon déterministe, sans dépendre de la largeur du viewport
// (le rendu inline partage le viewport plein écran de l'app).
export const EmbeddedViewContext = createContext(false);

export const useIsEmbeddedView = () => useContext(EmbeddedViewContext);
