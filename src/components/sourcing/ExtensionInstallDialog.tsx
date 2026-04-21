/**
 * Dialogue d'installation de l'extension Chrome Leazr Sourcing Helper.
 *
 * Flow :
 *  1. Télécharger le .zip depuis /leazr-sourcing-extension.zip (servi par Vite en prod)
 *  2. L'utilisateur dézippe localement
 *  3. Charger l'extension non empaquetée dans chrome://extensions
 *
 * Pas de Chrome Web Store pour l'instant — process de review trop long +
 * c'est une extension usage interne iTakecare. Distribution privée via leazr.co.
 */
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Chrome, Download, Info, RefreshCw } from "lucide-react";

interface ExtensionInstallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ZIP_URL = "/leazr-sourcing-extension.zip";
const ZIP_FILENAME = "leazr-sourcing-extension.zip";

const ExtensionInstallDialog: React.FC<ExtensionInstallDialogProps> = ({ open, onOpenChange }) => {
  const handleDownload = () => {
    // Déclenche le téléchargement — pas d'ouverture d'onglet
    const link = document.createElement("a");
    link.href = ZIP_URL;
    link.download = ZIP_FILENAME;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openExtensionsPage = () => {
    // chrome://extensions n'est pas ouvrable depuis une page web (Chrome le bloque
    // pour des raisons de sécurité). On copie juste l'URL dans le presse-papier
    // et on affiche un toast implicite via le bouton.
    navigator.clipboard.writeText("chrome://extensions/").catch(() => {
      /* ignore */
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Chrome className="h-5 w-5 text-indigo-600" />
            Installer l'extension Leazr Sourcing
          </DialogTitle>
          <DialogDescription>
            L'extension Chrome est indispensable pour lancer les recherches multi-fournisseurs en
            temps réel (Coolblue, MediaMarkt, Apple Refurbished, Amazon, Gomibo, Chapp…).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Étape 1 : télécharger */}
          <div className="flex gap-3 items-start rounded-lg border border-indigo-200 bg-indigo-50/40 p-4">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-white font-bold text-sm shrink-0">
              1
            </div>
            <div className="flex-1 space-y-2">
              <h4 className="font-semibold text-sm">Télécharger l'archive</h4>
              <p className="text-xs text-muted-foreground">
                Le fichier ZIP contient l'extension compilée, signée par iTakecare.
              </p>
              <Button
                onClick={handleDownload}
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
              >
                <Download className="h-4 w-4" />
                Télécharger {ZIP_FILENAME}
              </Button>
            </div>
          </div>

          {/* Étape 2 : dézipper */}
          <div className="flex gap-3 items-start rounded-lg border p-4">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-800 text-white font-bold text-sm shrink-0">
              2
            </div>
            <div className="flex-1 space-y-1">
              <h4 className="font-semibold text-sm">Dézipper le fichier</h4>
              <p className="text-xs text-muted-foreground">
                Double-clique sur l'archive pour obtenir un dossier{" "}
                <code className="bg-muted px-1 rounded">leazr-sourcing-extension</code>. Retiens son
                emplacement.
              </p>
            </div>
          </div>

          {/* Étape 3 : ouvrir chrome://extensions */}
          <div className="flex gap-3 items-start rounded-lg border p-4">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-800 text-white font-bold text-sm shrink-0">
              3
            </div>
            <div className="flex-1 space-y-2">
              <h4 className="font-semibold text-sm">
                Ouvrir <code className="bg-muted px-1 rounded text-xs">chrome://extensions</code>
              </h4>
              <p className="text-xs text-muted-foreground">
                Chrome ne permet pas de l'ouvrir via un lien. Copie l'URL ci-dessous et colle-la
                dans un nouvel onglet.
              </p>
              <Button
                onClick={openExtensionsPage}
                size="sm"
                variant="outline"
                className="gap-2 font-mono text-xs"
              >
                chrome://extensions/
                <span className="text-[10px] text-muted-foreground">(copier)</span>
              </Button>
              <p className="text-xs text-muted-foreground">
                Active ensuite le <strong>Mode développeur</strong> en haut à droite.
              </p>
            </div>
          </div>

          {/* Étape 4 : charger non empaqueté */}
          <div className="flex gap-3 items-start rounded-lg border p-4">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-800 text-white font-bold text-sm shrink-0">
              4
            </div>
            <div className="flex-1 space-y-1">
              <h4 className="font-semibold text-sm">Charger l'extension non empaquetée</h4>
              <p className="text-xs text-muted-foreground">
                Clique sur <strong>« Charger l'extension non empaquetée »</strong> et sélectionne
                le dossier dézippé à l'étape 2. L'extension apparaît dans la liste.
              </p>
            </div>
          </div>

          {/* Étape 5 : recharger Leazr */}
          <div className="flex gap-3 items-start rounded-lg border border-emerald-200 bg-emerald-50/40 p-4">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-sm shrink-0">
              5
            </div>
            <div className="flex-1 space-y-1">
              <h4 className="font-semibold text-sm">Recharger cette page</h4>
              <p className="text-xs text-muted-foreground">
                Une fois l'extension chargée, reviens sur Leazr et recharge (⌘R / Ctrl+R). Le badge
                passera à <span className="text-emerald-700 font-medium">« Extension connectée »</span>.
              </p>
              <Button
                onClick={() => window.location.reload()}
                size="sm"
                variant="outline"
                className="gap-2 mt-1"
              >
                <RefreshCw className="h-4 w-4" />
                Recharger maintenant
              </Button>
            </div>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              L'extension est propriété de iTakecare — elle ne collecte aucune donnée et communique
              uniquement avec <code>leazr.co</code>. Pour mettre à jour plus tard, re-télécharge le
              zip et répète les étapes 2 et 4.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExtensionInstallDialog;
