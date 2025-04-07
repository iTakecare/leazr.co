
import React, { useRef, useState, useEffect } from "react";
import SignaturePad from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import { Eraser, Save, RotateCcw, Check } from "lucide-react";
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

  // Vérifier si la signature est vide après chaque trait
  useEffect(() => {
    const checkIfEmpty = () => {
      if (sigCanvas.current) {
        setIsEmpty(sigCanvas.current.isEmpty());
        setIsTouched(true);
      }
    };

    const canvas = sigCanvas.current?.getCanvas();
    if (canvas) {
      canvas.addEventListener("mouseup", checkIfEmpty);
      canvas.addEventListener("touchend", checkIfEmpty);

      return () => {
        canvas.removeEventListener("mouseup", checkIfEmpty);
        canvas.removeEventListener("touchend", checkIfEmpty);
      };
    }
  }, [sigCanvas]);

  const clear = () => {
    if (sigCanvas.current) {
      sigCanvas.current.clear();
      setIsEmpty(true);
      setIsTouched(false);
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
        <SignaturePad
          ref={sigCanvas}
          penColor="black"
          canvasProps={{
            width: typeof width === "number" ? width : "100%",
            height,
            className: "signature-canvas w-full border-b",
            style: { width: "100%", height }
          }}
          backgroundColor="white"
          dotSize={1.5}
          velocityFilterWeight={0.6}
          clearOnResize={false}
          minWidth={1}
          maxWidth={2.5}
        />
        
        {isEmpty && isTouched && (
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
        >
          <Eraser className="h-4 w-4 mr-1" />
          Effacer
        </Button>
        <Button 
          variant="default" 
          size="sm" 
          onClick={save}
          disabled={isEmpty || disabled}
        >
          <Check className="h-4 w-4 mr-1" />
          Valider
        </Button>
      </div>
    </div>
  );
};

export default SignatureCanvas;
