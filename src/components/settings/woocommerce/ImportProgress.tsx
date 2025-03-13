
import React from 'react';
import { Progress } from '@/components/ui/progress';

interface ImportProgressProps {
  progress: number;
  stage: string;
  isActive: boolean;
}

const ImportProgress: React.FC<ImportProgressProps> = ({ progress, stage, isActive }) => {
  if (!isActive) return null;
  
  // Ensure progress is always a valid number between 0 and 100
  const safeProgress = isNaN(progress) ? 0 : Math.max(0, Math.min(100, progress));
  
  return (
    <div className="space-y-2 mt-4">
      <div className="flex justify-between text-xs text-gray-500">
        <span>{stage || 'Chargement en cours...'}</span>
        <span>{safeProgress}%</span>
      </div>
      <div className="w-full rounded-full overflow-hidden">
        <Progress 
          value={safeProgress} 
          className="h-2 transition-all"
        />
      </div>
    </div>
  );
};

export default ImportProgress;
