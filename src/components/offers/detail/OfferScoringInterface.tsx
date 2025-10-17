import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  CheckCircle, 
  HelpCircle, 
  X, 
  FileText, 
  Search,
  Building
} from "lucide-react";
import { toast } from "sonner";

interface OfferScoringInterfaceProps {
  offerId: string;
  currentStatus: string;
  analysisType: 'internal' | 'leaser';
  onScoreAssigned: (score: 'A' | 'B' | 'C', reason?: string) => void;
  isLoading?: boolean;
}

const REJECTION_REASONS = [
  "Sans suite - Plus de nouvelles",
  "Sans suite - Ne souhaite plus de leasing",
  "REFUS - client suspect / Fraude",
  "REFUS - entreprise trop jeune / montant demandé",
  "REFUS - Client particulier"
];

const OfferScoringInterface: React.FC<OfferScoringInterfaceProps> = ({
  offerId,
  currentStatus,
  analysisType,
  onScoreAssigned,
  isLoading = false
}) => {
  const [selectedScore, setSelectedScore] = useState<'A' | 'B' | 'C' | null>(null);
  const [selectedRejectionReason, setSelectedRejectionReason] = useState<string>("");
  const [reason, setReason] = useState("");

  const isInternalAnalysis = analysisType === 'internal';
  const canScore = currentStatus === (isInternalAnalysis ? 'sent' : 'internal_approved');

  const scoreOptions = [
    {
      score: 'A' as const,
      label: 'Approuvé',
      description: 'Dossier complet - Poursuite du processus',
      icon: CheckCircle,
      color: 'bg-green-50 text-green-700 border-green-200',
      nextStep: isInternalAnalysis ? 'vers Analyse Leaser' : 'vers Offre validée'
    },
    {
      score: 'B' as const,
      label: 'Documents requis',
      description: 'Dossier incomplet - Demande de documents',
      icon: HelpCircle,
      color: 'bg-amber-50 text-amber-700 border-amber-200',
      nextStep: 'Demande de documents supplémentaires'
    },
    {
      score: 'C' as const,
      label: 'Refusé',
      description: 'Dossier non conforme - Refus',
      icon: X,
      color: 'bg-red-50 text-red-700 border-red-200',
      nextStep: 'Fin du processus'
    }
  ];

  const handleScoreSelection = (score: 'A' | 'B' | 'C') => {
    setSelectedScore(score);
    setSelectedRejectionReason("");
    setReason("");
  };

  const handleSubmit = () => {
    if (!selectedScore) {
      toast.error("Veuillez sélectionner un score");
      return;
    }

    if (selectedScore === 'B' && !reason.trim()) {
      toast.error("Veuillez préciser les documents requis");
      return;
    }

    if (selectedScore === 'C' && !selectedRejectionReason) {
      toast.error("Veuillez sélectionner une raison de refus");
      return;
    }

    const finalReason = selectedScore === 'C' 
      ? `${selectedRejectionReason}${reason.trim() ? `\n\nComplément: ${reason.trim()}` : ''}`
      : reason.trim() || undefined;

    onScoreAssigned(selectedScore, finalReason);
  };

  if (!canScore) {
    return null;
  }

  return (
    <Card className="border-2 border-purple-200 bg-purple-50/30">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          {isInternalAnalysis ? (
            <Search className="h-5 w-5 text-purple-600" />
          ) : (
            <Building className="h-5 w-5 text-blue-600" />
          )}
          {isInternalAnalysis ? 'Analyse Interne' : 'Analyse Leaser'}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Évaluez le dossier et attribuez un score pour déterminer la suite du processus.
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Options de scoring */}
        <div className="grid gap-3">
          {scoreOptions.map((option) => {
            const Icon = option.icon;
            const isSelected = selectedScore === option.score;
            
            return (
              <div
                key={option.score}
                className={`
                  border-2 rounded-lg p-4 cursor-pointer transition-all duration-200
                  ${isSelected 
                    ? `${option.color} border-current` 
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                  }
                `}
                onClick={() => handleScoreSelection(option.score)}
              >
                <div className="flex items-start gap-3">
                  <Icon className={`h-5 w-5 mt-0.5 ${isSelected ? 'text-current' : 'text-gray-500'}`} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className={isSelected ? option.color : 'bg-gray-100'}>
                        Score {option.score}
                      </Badge>
                      <span className={`font-medium ${isSelected ? 'text-current' : 'text-gray-900'}`}>
                        {option.label}
                      </span>
                    </div>
                    <p className={`text-sm ${isSelected ? 'text-current' : 'text-gray-600'} mb-2`}>
                      {option.description}
                    </p>
                    <p className={`text-xs ${isSelected ? 'text-current' : 'text-gray-500'}`}>
                      ➜ {option.nextStep}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Zone de commentaire pour score B */}
        {selectedScore === 'B' && (
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Documents requis
              <span className="text-red-500 ml-1">*</span>
            </label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Précisez les documents manquants ou supplémentaires requis..."
              rows={3}
            />
          </div>
        )}

        {/* Zone de sélection et commentaire pour score C */}
        {selectedScore === 'C' && (
          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Raison du refus
                <span className="text-red-500 ml-1">*</span>
              </label>
              <Select 
                value={selectedRejectionReason} 
                onValueChange={setSelectedRejectionReason}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sélectionnez une raison de refus..." />
                </SelectTrigger>
                <SelectContent>
                  {REJECTION_REASONS.map((rejectionReason) => (
                    <SelectItem key={rejectionReason} value={rejectionReason}>
                      {rejectionReason}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Complément d'information (optionnel)
              </label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ajoutez des détails supplémentaires si nécessaire..."
                rows={3}
              />
            </div>
          </div>
        )}

        {/* Zone de commentaire optionnel pour score A */}
        {selectedScore === 'A' && (
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Commentaire (optionnel)
            </label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ajoutez un commentaire sur l'approbation..."
              rows={2}
            />
          </div>
        )}

        {/* Bouton de validation */}
        {selectedScore && (
          <Button 
            onClick={handleSubmit}
            disabled={isLoading}
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <>
                <div className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-white rounded-full"></div>
                Traitement...
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                Valider le score {selectedScore}
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default OfferScoringInterface;