import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';

interface ConditionsEditorProps {
  conditions: string[];
  onChange: (conditions: string[]) => void;
}

export const ConditionsEditor: React.FC<ConditionsEditorProps> = ({ 
  conditions, 
  onChange 
}) => {
  const handleAddCondition = () => {
    onChange([...conditions, '']);
  };
  
  const handleUpdateCondition = (index: number, value: string) => {
    const updated = [...conditions];
    updated[index] = value;
    onChange(updated);
  };
  
  const handleDeleteCondition = (index: number) => {
    onChange(conditions.filter((_, i) => i !== index));
  };
  
  return (
    <div className="space-y-3">
      {conditions.map((condition, index) => (
        <div key={index} className="flex items-start gap-2">
          <span className="text-sm font-medium text-muted-foreground mt-2 min-w-[20px]">
            {index + 1}.
          </span>
          <Textarea
            value={condition}
            onChange={(e) => handleUpdateCondition(index, e.target.value)}
            className="flex-1 min-h-[60px]"
            placeholder="Entrez une condition..."
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDeleteCondition(index)}
            className="mt-1"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      
      <Button
        variant="outline"
        size="sm"
        onClick={handleAddCondition}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        Ajouter une condition
      </Button>
    </div>
  );
};
