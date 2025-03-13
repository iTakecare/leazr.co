
import React from 'react';
import { AlertCircle } from 'lucide-react';

interface ErrorsListProps {
  errors: string[];
}

const ErrorsList: React.FC<ErrorsListProps> = ({ errors }) => {
  if (errors.length === 0) return null;
  
  return (
    <div className="mt-4 space-y-2">
      <h4 className="text-sm font-medium text-gray-900 flex items-center gap-2">
        <AlertCircle className="h-4 w-4 text-red-500" />
        Erreurs ({errors.length})
      </h4>
      <div className="max-h-60 overflow-y-auto rounded-md border border-red-100 bg-red-50 p-3">
        <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
          {errors.map((error, index) => (
            <li key={index}>{error}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default ErrorsList;
