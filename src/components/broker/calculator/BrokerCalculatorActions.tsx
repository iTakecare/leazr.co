import React from 'react';
import { Button } from '@/components/ui/button';
import { Save, Printer, FileText } from 'lucide-react';

interface BrokerCalculatorActionsProps {
  onSave: () => void;
  onPrint: () => void;
  onGenerateOffer: () => void;
  isValid: boolean;
  isSaving?: boolean;
}

const BrokerCalculatorActions: React.FC<BrokerCalculatorActionsProps> = ({
  onSave,
  onPrint,
  onGenerateOffer,
  isValid,
  isSaving = false
}) => {
  return (
    <div className="flex gap-3 justify-end">
      <Button
        variant="outline"
        onClick={onPrint}
        disabled={!isValid}
      >
        <Printer className="h-4 w-4 mr-2" />
        Imprimer
      </Button>
      
      <Button
        variant="outline"
        onClick={onGenerateOffer}
        disabled={!isValid || isSaving}
      >
        <FileText className="h-4 w-4 mr-2" />
        Générer l'offre
      </Button>
      
      <Button
        onClick={onSave}
        disabled={!isValid || isSaving}
      >
        <Save className="h-4 w-4 mr-2" />
        {isSaving ? 'Enregistrement...' : 'Enregistrer'}
      </Button>
    </div>
  );
};

export default BrokerCalculatorActions;
