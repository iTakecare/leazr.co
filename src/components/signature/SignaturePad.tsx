
import React, { useRef, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';

interface SignaturePadProps {
  onSignatureChange: (data: string) => void;
  className?: string;
  width?: number | string;
  height?: number | string;
  backgroundColor?: string;
  penColor?: string;
}

const SignaturePad: React.FC<SignaturePadProps> = ({
  onSignatureChange,
  className = 'h-40',
  width = '100%',
  height = 150,
  backgroundColor = 'white',
  penColor = '#1a56db',
}) => {
  const sigCanvas = useRef<SignatureCanvas>(null);

  // Clear signature
  const clear = () => {
    if (sigCanvas.current) {
      sigCanvas.current.clear();
      onSignatureChange('');
    }
  };

  // Handle change in signature
  const handleChange = () => {
    if (sigCanvas.current) {
      const isEmpty = sigCanvas.current.isEmpty();
      if (!isEmpty) {
        const dataUrl = sigCanvas.current.toDataURL();
        onSignatureChange(dataUrl);
      } else {
        onSignatureChange('');
      }
    }
  };

  // Set up canvas when component mounts
  useEffect(() => {
    // Handle window resize to redraw signature properly
    const handleResize = () => {
      if (sigCanvas.current) {
        const data = sigCanvas.current.toData();
        sigCanvas.current.clear();
        if (data && data.length > 0) {
          sigCanvas.current.fromData(data);
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className={`relative ${className}`}>
      <SignatureCanvas
        ref={sigCanvas}
        penColor={penColor}
        canvasProps={{
          width: width,
          height: height,
          className: 'signature-canvas w-full h-full',
          style: { 
            backgroundColor: backgroundColor,
            cursor: 'crosshair',
          }
        }}
        onEnd={handleChange}
      />
      <button
        type="button"
        onClick={clear}
        className="absolute bottom-2 right-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs px-2 py-1 rounded"
      >
        Effacer
      </button>
    </div>
  );
};

export default SignaturePad;
