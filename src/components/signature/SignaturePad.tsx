
import React, { useRef, useState, useEffect } from "react";
import SignaturePad from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import { Eraser, Check } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SignaturePadProps {
  onSave: (signature: string) => void;
  width?: number | string;
  height?: number | string;
  className?: string;
  disabled?: boolean;
}

const SignatureCanvas: React.FC<SignaturePadProps> = ({
  onSave,
  width = "100%",
  height = 200,
  className = "",
  disabled = false
}) => {
  const sigCanvas = useRef<SignaturePad | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const [isTouched, setIsTouched] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [showEmptyError, setShowEmptyError] = useState(false);

  // Vérifier si la signature est vide après chaque trait
  useEffect(() => {
    const checkIfEmpty = () => {
      if (sigCanvas.current) {
        const isCanvasEmpty = sigCanvas.current.isEmpty();
        setIsEmpty(isCanvasEmpty);
        
        // Si l'utilisateur a terminé un trait et que la canvas est vide,
        // on considère qu'il a essayé de signer mais n'a rien dessiné
        if (isCanvasEmpty && hasDrawn) {
          setShowEmptyError(true);
        } else if (!isCanvasEmpty) {
          setShowEmptyError(false);
        }
      }
    };

    // Mettre en place les écouteurs d'événements
    if (sigCanvas.current) {
      const canvas = sigCanvas.current.getCanvas();
      
      // Nettoyer le canvas au démarrage
      setTimeout(() => {
        if (sigCanvas.current) {
          sigCanvas.current.clear();
          setIsEmpty(true);
          setShowEmptyError(false);
          setHasDrawn(false);
          setIsTouched(false);
        }
      }, 100);
      
      // Événements pour la fin d'un trait
      canvas.addEventListener("mouseup", checkIfEmpty);
      canvas.addEventListener("touchend", checkIfEmpty);
      
      // Événements pour le début d'un trait
      canvas.addEventListener("mousedown", () => {
        setIsTouched(true);
        setHasDrawn(true);
        setShowEmptyError(false);
      });
      canvas.addEventListener("touchstart", () => {
        setIsTouched(true);
        setHasDrawn(true);
        setShowEmptyError(false);
      });

      // Événements pendant le dessin
      const handleDrawing = () => {
        if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
          setShowEmptyError(false);
        }
      };
      canvas.addEventListener("mousemove", handleDrawing);
      canvas.addEventListener("touchmove", handleDrawing);

      return () => {
        canvas.removeEventListener("mouseup", checkIfEmpty);
        canvas.removeEventListener("touchend", checkIfEmpty);
        canvas.removeEventListener("mousedown", () => {
          setIsTouched(true);
          setHasDrawn(true);
        });
        canvas.removeEventListener("touchstart", () => {
          setIsTouched(true);
          setHasDrawn(true);
        });
        canvas.removeEventListener("mousemove", handleDrawing);
        canvas.removeEventListener("touchmove", handleDrawing);
      };
    }
  }, [sigCanvas.current, hasDrawn]);

  const clear = () => {
    if (sigCanvas.current) {
      sigCanvas.current.clear();
      setIsEmpty(true);
      setIsTouched(false);
      setHasDrawn(false);
      setShowEmptyError(false);
    }
  };

  const save = () => {
    if (sigCanvas.current && !isEmpty) {
      try {
        const dataURL = sigCanvas.current.toDataURL("image/png");
        onSave(dataURL);
      } catch (err) {
        console.error("Erreur lors de la génération de la signature:", err);
        alert("Une erreur s'est produite lors de l'enregistrement de la signature. Veuillez réessayer.");
      }
    } else {
      // Afficher le message d'erreur si l'utilisateur tente de sauvegarder une signature vide
      setShowEmptyError(true);
    }
  };

  return (
    <div className={`border rounded-md overflow-hidden ${className}`}>
      <div className="bg-gray-50 p-3 border-b">
        <p className="text-sm text-gray-700 font-medium">
          Signez dans le cadre ci-dessous
        </p>
        <p className="text-xs text-gray-500">
          Utilisez votre souris, trackpad ou écran tactile pour signer
        </p>
      </div>
      
      <div className="bg-white relative" style={{ touchAction: "none" }}>
        <div style={{ 
          width: typeof width === "number" ? `${width}px` : width,
          height: typeof height === "number" ? `${height}px` : height,
          position: "relative"
        }}>
          <SignaturePad
            ref={sigCanvas}
            penColor="black"
            canvasProps={{
              width: typeof width === "number" ? width : "100%",
              height,
              className: "signature-canvas w-full border-b",
              style: { 
                width: "100%", 
                height,
                cursor: "crosshair",
                touchAction: "none"
              }
            }}
            backgroundColor="white"
            dotSize={2}
            velocityFilterWeight={0.7}
            clearOnResize={false}
            minWidth={1.5}
            maxWidth={3}
          />
        </div>
        
        {showEmptyError && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
            <Alert variant="destructive" className="w-auto mx-auto">
              <AlertDescription>
                La signature ne peut pas être vide
              </AlertDescription>
            </Alert>
          </div>
        )}
      </div>
      
      <div className="flex justify-between gap-2 p-3 bg-gray-50 border-t">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={clear}
          disabled={isEmpty || disabled}
          type="button"
        >
          <Eraser className="h-4 w-4 mr-1" />
          Effacer
        </Button>
        <Button 
          variant="default" 
          size="sm" 
          onClick={save}
          disabled={isEmpty || disabled}
          type="button"
        >
          <Check className="h-4 w-4 mr-1" />
          Valider
        </Button>
      </div>
    </div>
  );
};

export default SignatureCanvas;
