
import React, { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Eraser, Save } from "lucide-react";

interface SignaturePadProps {
  width?: number;
  height?: number;
  onSave?: (signature: string) => void;
  disabled?: boolean;
  className?: string;
}

const SignaturePad: React.FC<SignaturePadProps> = ({
  width = 300,
  height = 150,
  onSave,
  disabled = false,
  className = "",
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);

  // Initialize canvas context
  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      
      if (context) {
        context.lineWidth = 2;
        context.lineCap = "round";
        context.strokeStyle = "#000";
        setCtx(context);
      }
    }
  }, []);

  // Handle drawing events
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (disabled || !ctx) return;
    
    setIsDrawing(true);
    
    // Get position
    const pos = getPointerPosition(e);
    if (pos) {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || disabled || !ctx) return;
    
    // Prevent scrolling on touch devices
    e.preventDefault();
    
    // Get position
    const pos = getPointerPosition(e);
    if (pos) {
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      setHasSignature(true);
    }
  };

  const endDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      if (ctx) ctx.closePath();
    }
  };

  // Get pointer position (works for both mouse and touch)
  const getPointerPosition = (e: React.MouseEvent | React.TouchEvent) => {
    if (!canvasRef.current) return null;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    // Check if it's touch event
    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
      };
    } else {
      // Mouse event
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }
  };

  // Clear signature
  const clearSignature = () => {
    if (!ctx || !canvasRef.current) return;
    
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setHasSignature(false);
  };

  // Save signature as data URL
  const saveSignature = () => {
    if (!canvasRef.current || !hasSignature || !onSave) return;
    
    const dataUrl = canvasRef.current.toDataURL("image/png");
    onSave(dataUrl);
  };

  return (
    <div className={`flex flex-col ${className}`}>
      <div className="border border-gray-300 rounded-md bg-white">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className={`touch-none ${disabled ? 'cursor-not-allowed opacity-70' : 'cursor-crosshair'}`}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={endDrawing}
          onMouseLeave={endDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={endDrawing}
          style={{ width: '100%', height: 'auto' }}
        />
      </div>
      
      <div className="flex gap-2 mt-2 justify-between">
        <Button 
          type="button" 
          variant="outline" 
          size="sm"
          onClick={clearSignature}
          disabled={disabled || !hasSignature}
        >
          <Eraser className="h-4 w-4 mr-1" /> Effacer
        </Button>
        
        <Button 
          type="button" 
          size="sm"
          onClick={saveSignature}
          disabled={disabled || !hasSignature}
        >
          <Save className="h-4 w-4 mr-1" /> Enregistrer
        </Button>
      </div>
    </div>
  );
};

export default SignaturePad;
