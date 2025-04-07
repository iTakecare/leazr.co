
import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

export interface SignaturePadProps {
  onSave: (signatureData: string) => void;
  disabled?: boolean;
  height?: number;
  className?: string;
  width?: number;
}

const SignatureCanvas: React.FC<SignaturePadProps> = ({
  onSave,
  disabled = false,
  height = 200,
  width,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    // Set canvas background
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Set initial drawing style
    context.strokeStyle = '#000';
    context.lineWidth = 2;
    context.lineCap = 'round';
    context.lineJoin = 'round';
  }, []);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const context = canvas.getContext('2d');
    if (!context) return;
    
    setIsDrawing(true);
    setHasSignature(true);
    
    // Get coordinates
    const coords = getCoordinates(e);
    if (!coords) return;
    
    context.beginPath();
    context.moveTo(coords.x, coords.y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || disabled) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const context = canvas.getContext('2d');
    if (!context) return;
    
    // Prevent scrolling when drawing on canvas
    e.preventDefault();
    
    // Get coordinates
    const coords = getCoordinates(e);
    if (!coords) return;
    
    context.lineTo(coords.x, coords.y);
    context.stroke();
  };

  const stopDrawing = () => {
    if (disabled) return;
    setIsDrawing(false);
  };
  
  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    
    // Handle both mouse and touch events
    if ('touches' in e) {
      // Touch event
      if (e.touches.length === 0) return null; // No touches
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      // Mouse event
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const context = canvas.getContext('2d');
    if (!context) return;
    
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const saveSignature = () => {
    if (!hasSignature) {
      return;
    }
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const signatureData = canvas.toDataURL('image/png');
    onSave(signatureData);
  };

  return (
    <div className={`flex flex-col space-y-2 ${className}`}>
      <div className="border rounded-md overflow-hidden">
        <canvas
          ref={canvasRef}
          width={width || 500}
          height={height}
          className="w-full touch-none"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          style={{ cursor: disabled ? 'not-allowed' : 'crosshair' }}
        />
      </div>
      
      <div className="flex justify-between gap-2">
        <Button 
          type="button"
          variant="outline" 
          size="sm"
          onClick={clearCanvas}
          disabled={disabled || !hasSignature}
          className="flex-1"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Effacer
        </Button>
        <Button 
          type="button"
          variant="default" 
          size="sm"
          onClick={saveSignature}
          disabled={disabled || !hasSignature}
          className="flex-1"
        >
          Valider
        </Button>
      </div>
    </div>
  );
};

export default SignatureCanvas;
