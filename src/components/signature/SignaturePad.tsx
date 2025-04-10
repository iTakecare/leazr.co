
import React, { useRef, useState, useEffect } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import { Undo2, Save } from "lucide-react";

interface SignaturePadProps {
  onSave: (signatureData: string) => void;
  disabled?: boolean;
  initialSignature?: string;
  height?: number;
  className?: string;
}

const SignaturePad: React.FC<SignaturePadProps> = ({
  onSave,
  disabled = false,
  initialSignature,
  height = 200,
  className = ""
}) => {
  const sigCanvas = useRef<SignatureCanvas>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  
  useEffect(() => {
    // Clear signature when component is disabled
    if (disabled && sigCanvas.current) {
      sigCanvas.current.clear();
      setIsEmpty(true);
    }
  }, [disabled]);

  useEffect(() => {
    // Load initial signature if provided
    if (initialSignature && sigCanvas.current) {
      sigCanvas.current.fromDataURL(initialSignature);
      setIsEmpty(false);
    }
  }, [initialSignature]);

  const clear = () => {
    if (sigCanvas.current) {
      sigCanvas.current.clear();
      setIsEmpty(true);
    }
  };

  const handleSave = () => {
    if (sigCanvas.current && !isEmpty && !disabled) {
      const signatureData = sigCanvas.current.toDataURL("image/png");
      onSave(signatureData);
    }
  };

  const handleBegin = () => {
    setIsEmpty(false);
  };

  return (
    <div className={`w-full ${className}`}>
      <div 
        className={`border rounded signature-pad-container ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
        style={{ pointerEvents: disabled ? 'none' : 'auto' }}
      >
        <SignatureCanvas
          ref={sigCanvas}
          canvasProps={{
            className: "signature-canvas w-full",
            style: { 
              height: `${height}px`, 
              background: disabled ? '#f3f4f6' : 'white',
              cursor: disabled ? 'not-allowed' : 'crosshair'
            }
          }}
          onBegin={handleBegin}
          penColor="black"
        />
      </div>
      <div className="flex justify-between mt-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={clear}
          disabled={isEmpty || disabled}
          className="text-xs h-8"
        >
          <Undo2 className="h-3 w-3 mr-1" />
          Effacer
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={handleSave}
          disabled={isEmpty || disabled}
          className="text-xs h-8"
        >
          <Save className="h-3 w-3 mr-1" />
          Signer
        </Button>
      </div>
    </div>
  );
};

export default SignaturePad;

