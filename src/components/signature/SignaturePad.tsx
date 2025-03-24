
import React, { useRef, useState, useEffect } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import { Eraser, Save, RotateCcw } from "lucide-react";

interface SignaturePadProps {
  onSave: (signature: string) => void;
  width?: number | string;
  height?: number | string;
  className?: string;
  disabled?: boolean;
}

const SignaturePad: React.FC<SignaturePadProps> = ({
  onSave,
  width = "100%",
  height = 200,
  className = "",
  disabled = false
}) => {
  const sigCanvas = useRef<SignatureCanvas | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  // Vérifier si la signature est vide après chaque trait
  useEffect(() => {
    const checkIfEmpty = () => {
      if (sigCanvas.current) {
        setIsEmpty(sigCanvas.current.isEmpty());
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
    }
  };

  const save = () => {
    if (sigCanvas.current && !isEmpty) {
      const dataURL = sigCanvas.current.toDataURL("image/png");
      onSave(dataURL);
    }
  };

  return (
    <div className={`border rounded-md ${className}`}>
      <div className="bg-gray-50 p-2 border-b">
        <p className="text-sm text-gray-500">
          Signez dans le cadre ci-dessous en utilisant votre souris ou votre doigt
        </p>
      </div>
      
      <div className="bg-white" style={{ touchAction: "none" }}>
        <SignatureCanvas
          ref={sigCanvas}
          penColor="black"
          canvasProps={{
            width: typeof width === "number" ? width : "100%",
            height,
            className: "signature-canvas w-full",
            style: { width: "100%", height }
          }}
          backgroundColor="white"
          dotSize={2}
          velocityFilterWeight={0.4}
          clearOnResize={false}
          disabled={disabled}
        />
      </div>
      
      <div className="flex gap-2 p-2 bg-gray-50 border-t">
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
          <Save className="h-4 w-4 mr-1" />
          Enregistrer
        </Button>
      </div>
    </div>
  );
};

export default SignaturePad;
