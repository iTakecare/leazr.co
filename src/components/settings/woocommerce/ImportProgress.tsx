
import React from 'react';
import { Progress } from '@/components/ui/progress';

interface ImportProgressProps {
  progress: number;
  stage: string;
  isActive: boolean;
}

const ImportProgress: React.FC<ImportProgressProps> = ({ progress, stage, isActive }) => {
  if (!isActive) return null;
  
  return (
    <div className="space-y-2 mt-4">
      <div className="flex justify-between text-xs text-gray-500">
        <span>{stage}</span>
        <span>{progress}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <Progress 
          value={progress} 
          className="h-2"
        />
      </div>
    </div>
  );
};

export default ImportProgress;
