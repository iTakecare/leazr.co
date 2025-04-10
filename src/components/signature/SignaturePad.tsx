
import React, { useRef, useState, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Button } from '@/components/ui/button';
import { RefreshCw, Check } from 'lucide-react';

interface SignaturePadProps {
  onSave: (data: string) => void;
  disabled?: boolean;
  height?: number;
  className?: string;
}

const SignaturePad: React.FC<SignaturePadProps> = ({ 
  onSave, 
  disabled = false,
  height = 200,
  className = ''
}) => {
  const sigCanvas = useRef<SignatureCanvas | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [canvasWidth, setCanvasWidth] = useState<number>(0);
  const [isEmpty, setIsEmpty] = useState(true);
  
  // Handle window resize to update canvas width
  useEffect(() => {
    const updateCanvasWidth = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        setCanvasWidth(width);
      }
    };
    
    // Set initial width
    updateCanvasWidth();
    
    // Update width on resize
    window.addEventListener('resize', updateCanvasWidth);
    
    return () => {
      window.removeEventListener('resize', updateCanvasWidth);
    };
  }, []);
  
  // Function to clear the signature
  const clear = () => {
    if (sigCanvas.current) {
      sigCanvas.current.clear();
      setIsEmpty(true);
    }
  };
  
  // Function to save the signature
  const save = () => {
    if (sigCanvas.current && !disabled) {
      if (sigCanvas.current.isEmpty()) {
        // Show error or alert that signature is empty
        console.log("Signature is empty");
        return;
      }
      
      // Get the signature as a data URL
      const dataURL = sigCanvas.current.toDataURL('image/png');
      console.log("Signature capture - length:", dataURL.length);
      onSave(dataURL);
    }
  };
  
  // Check if canvas is empty after each end event
  const handleEnd = () => {
    if (sigCanvas.current) {
      setIsEmpty(sigCanvas.current.isEmpty());
    }
  };
  
  return (
    <div className={`${className} flex flex-col touch-manipulation`} ref={containerRef}>
      <div className="border border-gray-200 bg-white rounded-md overflow-hidden touch-none">
        {canvasWidth > 0 && (
          <SignatureCanvas
            ref={sigCanvas}
            penColor="black"
            canvasProps={{
              width: canvasWidth,
              height: height,
              className: 'signature-canvas touch-none',
              style: { 
                width: '100%',
                height: `${height}px`,
                background: 'white',
                touchAction: 'none'
              }
            }}
            onEnd={handleEnd}
            backgroundColor="white"
          />
        )}
      </div>
      
      <div className="flex justify-between mt-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={clear}
          disabled={disabled || isEmpty}
          className="flex items-center"
        >
          <RefreshCw className="h-4 w-4 mr-1" />
          Effacer
        </Button>
        
        <Button
          type="button"
          variant="default"
          size="sm"
          onClick={save}
          disabled={disabled || isEmpty}
          className="flex items-center"
        >
          <Check className="h-4 w-4 mr-1" />
          Valider
        </Button>
      </div>
    </div>
  );
};

export default SignaturePad;
