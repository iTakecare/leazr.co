import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Wand2, Eye, Check, X, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface DetectedField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'email' | 'phone';
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  suggested_mapping?: string;
}

interface SmartPDFFieldDetectionProps {
  pdfUrl: string;
  onFieldsDetected: (fields: DetectedField[]) => void;
  onFieldAccepted: (field: DetectedField) => void;
  onFieldRejected: (fieldId: string) => void;
}

export const SmartPDFFieldDetection: React.FC<SmartPDFFieldDetectionProps> = ({
  pdfUrl,
  onFieldsDetected,
  onFieldAccepted,
  onFieldRejected
}) => {
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectedFields, setDetectedFields] = useState<DetectedField[]>([]);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');

  const simulateFieldDetection = async () => {
    setIsDetecting(true);
    setProgress(0);
    setCurrentStep('Analyse du PDF...');

    // Simulation d'analyse avec progression
    const steps = [
      { step: 'Analyse du PDF...', progress: 20 },
      { step: 'Détection des zones de texte...', progress: 40 },
      { step: 'Classification des champs...', progress: 60 },
      { step: 'Reconnaissance intelligente...', progress: 80 },
      { step: 'Finalisation...', progress: 100 }
    ];

    for (const { step, progress } of steps) {
      setCurrentStep(step);
      setProgress(progress);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Simulation de champs détectés
    const mockFields: DetectedField[] = [
      {
        id: '1',
        name: 'Nom du client',
        type: 'text',
        x: 100,
        y: 200,
        width: 200,
        height: 30,
        confidence: 0.95,
        suggested_mapping: 'client_name'
      },
      {
        id: '2',
        name: 'Email',
        type: 'email',
        x: 350,
        y: 200,
        width: 250,
        height: 30,
        confidence: 0.88,
        suggested_mapping: 'client_email'
      },
      {
        id: '3',
        name: 'Montant',
        type: 'number',
        x: 100,
        y: 300,
        width: 150,
        height: 30,
        confidence: 0.92,
        suggested_mapping: 'amount'
      },
      {
        id: '4',
        name: 'Date',
        type: 'date',
        x: 350,
        y: 300,
        width: 150,
        height: 30,
        confidence: 0.85,
        suggested_mapping: 'date'
      }
    ];

    setDetectedFields(mockFields);
    onFieldsDetected(mockFields);
    setIsDetecting(false);
    toast.success(`${mockFields.length} champs détectés automatiquement!`);
  };

  const handleAcceptField = (field: DetectedField) => {
    onFieldAccepted(field);
    setDetectedFields(prev => prev.filter(f => f.id !== field.id));
    toast.success(`Champ "${field.name}" accepté`);
  };

  const handleRejectField = (fieldId: string) => {
    onFieldRejected(fieldId);
    setDetectedFields(prev => prev.filter(f => f.id !== fieldId));
    toast.info('Champ rejeté');
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'bg-green-500';
    if (confidence >= 0.8) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'email':
        return '📧';
      case 'date':
        return '📅';
      case 'number':
        return '🔢';
      default:
        return '📝';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            Détection Intelligente des Champs
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!isDetecting && detectedFields.length === 0 && (
            <div className="text-center py-8">
              <Wand2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                Lancez la détection automatique pour identifier les champs dans votre PDF
              </p>
              <Button onClick={simulateFieldDetection} className="gap-2">
                <Wand2 className="h-4 w-4" />
                Détecter les champs automatiquement
              </Button>
            </div>
          )}

          {isDetecting && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="mb-4">
                  <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    {currentStep}
                  </div>
                </div>
                <Progress value={progress} className="w-full" />
                <p className="text-sm text-muted-foreground mt-2">
                  {progress}% terminé
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {detectedFields.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              Champs Détectés ({detectedFields.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {detectedFields.map((field) => (
                <div
                  key={field.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getTypeIcon(field.type)}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{field.name}</span>
                        <Badge variant="outline">
                          {field.type}
                        </Badge>
                        <div className="flex items-center gap-1">
                          <div
                            className={`h-2 w-2 rounded-full ${getConfidenceColor(field.confidence)}`}
                          />
                          <span className="text-xs text-muted-foreground">
                            {Math.round(field.confidence * 100)}%
                          </span>
                        </div>
                      </div>
                      {field.suggested_mapping && (
                        <p className="text-sm text-muted-foreground">
                          Mapping suggéré: {field.suggested_mapping}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Position: x:{field.x}, y:{field.y} - Taille: {field.width}×{field.height}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAcceptField(field)}
                      className="text-green-600 hover:text-green-700"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRejectField(field.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};