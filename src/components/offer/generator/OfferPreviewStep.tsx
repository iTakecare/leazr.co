import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { FileText, User, Building2, Laptop, Calculator, CheckCircle } from 'lucide-react';
import { OfferFormData } from '@/hooks/useCustomOfferGenerator';

interface OfferPreviewStepProps {
  formData: OfferFormData;
  updateFormData: (section: keyof OfferFormData, data: any) => void;
}

export const OfferPreviewStep: React.FC<OfferPreviewStepProps> = ({
  formData
}) => {
  const { clientInfo, businessProfile, equipment, financing } = formData;

  const totalPurchasePrice = equipment.reduce((sum, eq) => 
    sum + (eq.purchasePrice * eq.quantity), 0
  );

  const totalMargin = equipment.reduce((sum, eq) => 
    sum + (eq.purchasePrice * eq.quantity * eq.margin / 100), 0
  );

  const totalAmount = totalPurchasePrice + totalMargin;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Aperçu de l'Offre
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Vérifiez tous les détails avant de générer votre offre personnalisée
          </p>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Informations Client */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-4 w-4" />
              Informations Client
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="font-medium">{clientInfo.name}</p>
              <p className="text-sm text-muted-foreground">{clientInfo.email}</p>
            </div>
            
            <Separator />
            
            <div>
              <p className="font-medium flex items-center gap-2">
                <Building2 className="h-3 w-3" />
                {clientInfo.company}
              </p>
              {clientInfo.vatNumber && (
                <p className="text-xs text-muted-foreground">TVA: {clientInfo.vatNumber}</p>
              )}
            </div>

            {clientInfo.address && (
              <>
                <Separator />
                <div className="text-sm">
                  <p>{clientInfo.address}</p>
                  <p>{clientInfo.postalCode} {clientInfo.city}</p>
                  <p>{clientInfo.country}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Profil d'activité */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Profil d'Activité
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">Secteur:</span>
              <Badge variant="secondary">{businessProfile.sector}</Badge>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm">Équipe:</span>
              <span className="font-medium">{businessProfile.teamSize} personne(s)</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm">Budget:</span>
              <span className="font-medium">{businessProfile.budget.toLocaleString('fr-FR')} €</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm">Mode de travail:</span>
              <Badge variant="outline">
                {businessProfile.workStyle === 'office' ? '🏢 Bureau' : 
                 businessProfile.workStyle === 'remote' ? '🏠 Télétravail' : 
                 '🔄 Hybride'}
              </Badge>
            </div>

            {businessProfile.specificNeeds.length > 0 && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium mb-2">Besoins spécifiques:</p>
                  <div className="flex flex-wrap gap-1">
                    {businessProfile.specificNeeds.slice(0, 3).map((need) => (
                      <Badge key={need} variant="outline" className="text-xs">
                        {need}
                      </Badge>
                    ))}
                    {businessProfile.specificNeeds.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{businessProfile.specificNeeds.length - 3} autres
                      </Badge>
                    )}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Équipements sélectionnés */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Laptop className="h-4 w-4" />
            Équipements Sélectionnés ({equipment.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {equipment.map((eq, index) => (
              <div key={eq.id || index} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium">{eq.title}</p>
                  <p className="text-sm text-muted-foreground">
                    Quantité: {eq.quantity} • Marge: {eq.margin}%
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">
                    {(eq.purchasePrice * eq.quantity).toLocaleString('fr-FR')} €
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Prix unitaire: {eq.purchasePrice.toLocaleString('fr-FR')} €
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Résumé financier */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2 text-primary">
            <Calculator className="h-4 w-4" />
            Résumé Financier
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-white/50 rounded-lg">
              <p className="text-2xl font-bold">{totalPurchasePrice.toLocaleString('fr-FR')} €</p>
              <p className="text-sm text-muted-foreground">Prix d'achat total</p>
            </div>
            
            <div className="text-center p-4 bg-white/50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">+{totalMargin.toLocaleString('fr-FR')} €</p>
              <p className="text-sm text-muted-foreground">Marge totale</p>
            </div>
            
            <div className="text-center p-4 bg-white/50 rounded-lg">
              <p className="text-2xl font-bold text-primary">{totalAmount.toLocaleString('fr-FR')} €</p>
              <p className="text-sm text-muted-foreground">Montant total</p>
            </div>
            
            <div className="text-center p-4 bg-white/50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">
                {financing.monthlyPayment > 0 ? `${financing.monthlyPayment.toFixed(2)} €` : 'N/A'}
              </p>
              <p className="text-sm text-muted-foreground">Mensualité</p>
            </div>
          </div>

          {financing.monthlyPayment > 0 && (
            <>
              <Separator className="my-4" />
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Financement sur <strong>{financing.duration} mois</strong> • 
                  Coefficient: <strong>{financing.coefficient}</strong>
                </p>
                <div className="flex items-center justify-center gap-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">Offre prête à être générée</span>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Instructions finales */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900 mb-1">Prêt à générer votre offre ?</h3>
              <p className="text-sm text-blue-800 mb-3">
                Votre offre personnalisée sera créée avec tous les détails ci-dessus. 
                Elle sera automatiquement sauvegardée et vous pourrez la modifier par la suite si nécessaire.
              </p>
              <div className="text-xs text-blue-700 space-y-1">
                <p>✓ PDF automatiquement généré avec vos templates</p>
                <p>✓ Calculs financiers intégrés</p>
                <p>✓ Historique et suivi des modifications</p>
                <p>✓ Envoi possible par email au client</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OfferPreviewStep;