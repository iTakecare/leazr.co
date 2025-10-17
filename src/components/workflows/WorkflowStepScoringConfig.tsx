import React from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Info } from 'lucide-react';

interface WorkflowStepScoringConfigProps {
  stepKey: string;
  enablesScoring: boolean;
  scoringType?: 'internal' | 'leaser' | 'client';
  scoringOptions?: {
    allow_approval: boolean;
    allow_rejection: boolean;
    allow_document_request: boolean;
  };
  nextStepOnApproval?: string;
  nextStepOnRejection?: string;
  nextStepOnDocsRequested?: string;
  availableSteps: { key: string; label: string }[];
  onEnablesScoringChange: (enabled: boolean) => void;
  onScoringTypeChange: (type: 'internal' | 'leaser' | 'client') => void;
  onScoringOptionsChange: (options: any) => void;
  onNextStepChange: (field: string, value: string) => void;
}

export const WorkflowStepScoringConfig: React.FC<WorkflowStepScoringConfigProps> = ({
  stepKey,
  enablesScoring,
  scoringType,
  scoringOptions = { allow_approval: true, allow_rejection: true, allow_document_request: true },
  nextStepOnApproval,
  nextStepOnRejection,
  nextStepOnDocsRequested,
  availableSteps,
  onEnablesScoringChange,
  onScoringTypeChange,
  onScoringOptionsChange,
  onNextStepChange
}) => {
  return (
    <Card className="border-purple-200 bg-purple-50/30">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Info className="h-4 w-4" />
          Configuration de la modale de scoring
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Activer le scoring */}
        <div className="flex items-center justify-between">
          <Label htmlFor={`scoring-${stepKey}`}>
            Activer la modale de scoring à cette étape
          </Label>
          <Switch
            id={`scoring-${stepKey}`}
            checked={enablesScoring}
            onCheckedChange={onEnablesScoringChange}
          />
        </div>

        {enablesScoring && (
          <>
            {/* Type d'analyse */}
            <div className="space-y-2">
              <Label>Type d'analyse</Label>
              <Select value={scoringType} onValueChange={onScoringTypeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez le type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="internal">Analyse Interne</SelectItem>
                  <SelectItem value="leaser">Analyse Leaser</SelectItem>
                  <SelectItem value="client">Approbation Client</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Options de scoring */}
            <div className="space-y-3">
              <Label>Options disponibles dans la modale</Label>
              <div className="space-y-2 pl-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`approval-${stepKey}`}
                    checked={scoringOptions.allow_approval}
                    onCheckedChange={(checked) => 
                      onScoringOptionsChange({ ...scoringOptions, allow_approval: checked })
                    }
                  />
                  <Label htmlFor={`approval-${stepKey}`} className="font-normal">Score A - Approbation</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`docs-${stepKey}`}
                    checked={scoringOptions.allow_document_request}
                    onCheckedChange={(checked) => 
                      onScoringOptionsChange({ ...scoringOptions, allow_document_request: checked })
                    }
                  />
                  <Label htmlFor={`docs-${stepKey}`} className="font-normal">Score B - Demande de documents</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`rejection-${stepKey}`}
                    checked={scoringOptions.allow_rejection}
                    onCheckedChange={(checked) => 
                      onScoringOptionsChange({ ...scoringOptions, allow_rejection: checked })
                    }
                  />
                  <Label htmlFor={`rejection-${stepKey}`} className="font-normal">Score C - Refus</Label>
                </div>
              </div>
            </div>

            {/* Étapes suivantes */}
            <div className="space-y-3 pt-2 border-t">
              <Label className="text-sm font-semibold">Transitions après scoring</Label>
              
              {scoringOptions.allow_approval && (
                <div className="space-y-2">
                  <Label className="text-sm">Étape suivante si approuvé (Score A)</Label>
                  <Select 
                    value={nextStepOnApproval} 
                    onValueChange={(value) => onNextStepChange('next_step_on_approval', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez l'étape" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSteps.map(step => (
                        <SelectItem key={step.key} value={step.key}>
                          {step.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {scoringOptions.allow_document_request && (
                <div className="space-y-2">
                  <Label className="text-sm">Étape suivante si documents demandés (Score B)</Label>
                  <Select 
                    value={nextStepOnDocsRequested} 
                    onValueChange={(value) => onNextStepChange('next_step_on_docs_requested', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez l'étape" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSteps.map(step => (
                        <SelectItem key={step.key} value={step.key}>
                          {step.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {scoringOptions.allow_rejection && (
                <div className="space-y-2">
                  <Label className="text-sm">Étape suivante si refusé (Score C)</Label>
                  <Select 
                    value={nextStepOnRejection} 
                    onValueChange={(value) => onNextStepChange('next_step_on_rejection', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez l'étape" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSteps.map(step => (
                        <SelectItem key={step.key} value={step.key}>
                          {step.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
