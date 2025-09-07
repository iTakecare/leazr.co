import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, Building, MapPin, Calendar, Users, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useCompanySearch } from '@/hooks/useCompanySearch';

interface CompanySearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCompanySelect: (companyData: any) => void;
  initialData?: {
    name?: string;
    vat_number?: string;
    country?: string;
  };
}

interface CompanyResult {
  name: string;
  country?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  vat_number?: string;
  siren?: string;
  siret?: string;
  sector?: string;
  legal_form?: string;
  creation_date?: string;
  employee_count?: string;
  source: string;
  confidence: number;
}

export const CompanySearchModal: React.FC<CompanySearchModalProps> = ({
  isOpen,
  onClose,
  onCompanySelect,
  initialData
}) => {
  const [searchQuery, setSearchQuery] = useState(initialData?.name || '');
  const [country, setCountry] = useState(initialData?.country || 'BE');
  const [searchType, setSearchType] = useState<'name' | 'vat' | 'siren' | 'siret'>('name');
  const [results, setResults] = useState<CompanyResult[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<CompanyResult | null>(null);
  
  const { searchCompanies, isLoading } = useCompanySearch();
  const { toast } = useToast();

  // Auto-detect search type based on input
  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toUpperCase();
      // Détection spécifique pour les numéros belges (BE + 10 chiffres)
      if (/^BE\d{10}$/.test(query) || /^BE\d{4}\.\d{3}\.\d{3}$/.test(query)) {
        setSearchType('siren'); // Traiter les numéros belges comme "siren" pour le routage
      } else if (/^[A-Z]{2}[\d\w]{8,12}$/.test(query)) {
        setSearchType('vat');
      } else if (/^\d{9}$/.test(query)) {
        setSearchType('siren');
      } else if (/^\d{14}$/.test(query)) {
        setSearchType('siret');
      } else if (/^\d{10}$/.test(query) || /^\d{4}\.\d{3}\.\d{3}$/.test(query)) {
        // Numéros belges sans préfixe BE
        setSearchType('siren');
      } else {
        setSearchType('name');
      }
    }
  }, [searchQuery]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Champ requis",
        description: "Veuillez saisir un terme de recherche",
        variant: "destructive"
      });
      return;
    }

    try {
      const searchResults = await searchCompanies({
        query: searchQuery.trim(),
        country,
        searchType,
        limit: 20
      });

      setResults(searchResults);
      
      if (searchResults.length === 0) {
        toast({
          title: "Aucun résultat",
          description: "Aucune entreprise trouvée avec ces critères",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Erreur recherche:', error);
      toast({
        title: "Erreur de recherche",
        description: "Impossible de rechercher l'entreprise",
        variant: "destructive"
      });
    }
  };

  const handleCompanySelect = (company: CompanyResult) => {
    setSelectedCompany(company);
  };

  const handleConfirmSelection = () => {
    if (selectedCompany) {
      const companyData = {
        name: selectedCompany.name,
        company: selectedCompany.name,
        address: selectedCompany.address,
        city: selectedCompany.city,
        postal_code: selectedCompany.postal_code,
        country: selectedCompany.country,
        vat_number: selectedCompany.vat_number,
        // Champs additionnels pour enrichissement
        sector: selectedCompany.sector,
        legal_form: selectedCompany.legal_form,
        creation_date: selectedCompany.creation_date,
        employee_count: selectedCompany.employee_count,
        siren: selectedCompany.siren,
        siret: selectedCompany.siret
      };
      
      onCompanySelect(companyData);
      onClose();
      
      toast({
        title: "Entreprise sélectionnée",
        description: `Les données de ${selectedCompany.name} ont été récupérées`,
      });
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'bg-green-100 text-green-800';
    if (confidence >= 0.7) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.9) return 'Excellente';
    if (confidence >= 0.7) return 'Bonne';
    return 'Faible';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Recherche d'entreprise
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="search" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="search">Recherche</TabsTrigger>
            <TabsTrigger value="results">Résultats ({results.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="country">Pays</Label>
                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BE">🇧🇪 Belgique</SelectItem>
                    <SelectItem value="FR">🇫🇷 France</SelectItem>
                    <SelectItem value="LU">🇱🇺 Luxembourg</SelectItem>
                    <SelectItem value="NL">🇳🇱 Pays-Bas</SelectItem>
                    <SelectItem value="DE">🇩🇪 Allemagne</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="searchType">Type de recherche</Label>
                <Select value={searchType} onValueChange={(value: any) => setSearchType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Nom d'entreprise</SelectItem>
                    <SelectItem value="vat">Numéro TVA</SelectItem>
                    <SelectItem value="siren">SIREN (9 chiffres)</SelectItem>
                    <SelectItem value="siret">SIRET (14 chiffres)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="query">Recherche</Label>
                <div className="flex gap-2">
                  <Input
                    id="query"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={
                      searchType === 'name' ? 'Nom de l\'entreprise...' :
                      searchType === 'vat' ? 'BE0123456789' :
                      searchType === 'siren' ? '123456789' :
                      '12345678901234'
                    }
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  />
                  <Button 
                    onClick={handleSearch} 
                    disabled={isLoading || !searchQuery.trim()}
                    size="icon"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
              <div>
                <h4 className="font-medium mb-2">💡 Conseils de recherche</h4>
                <ul className="space-y-1">
                  <li>• Utilisez le nom complet ou partiel</li>
                  <li>• Les numéros sont détectés automatiquement</li>
                  <li>• Sélectionnez le bon pays pour de meilleurs résultats</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">🆓 Sources gratuites</h4>
                <ul className="space-y-1">
                  <li>• API Sirene INSEE (France)</li>
                  <li>• CBE Belgique (registre officiel)</li>
                  <li>• Base VIES (TVA européenne)</li>
                  <li>• Registres publics Luxembourg</li>
                </ul>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="results" className="space-y-4">
            {results.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Building className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Aucun résultat trouvé</p>
                <p className="text-sm">Essayez avec d'autres critères de recherche</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {results.map((company, index) => (
                  <Card 
                    key={index} 
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedCompany === company ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => handleCompanySelect(company)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Building className="h-5 w-5" />
                            {company.name}
                            {selectedCompany === company && (
                              <CheckCircle2 className="h-5 w-5 text-green-600" />
                            )}
                          </CardTitle>
                          <CardDescription className="flex items-center gap-4 mt-1">
                            {company.country && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {company.country}
                              </span>
                            )}
                            {company.legal_form && (
                              <span>{company.legal_form}</span>
                            )}
                          </CardDescription>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge 
                            className={getConfidenceColor(company.confidence)}
                            variant="secondary"
                          >
                            {getConfidenceLabel(company.confidence)}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {company.source}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="space-y-2">
                          {company.address && (
                            <div>
                              <span className="font-medium">Adresse:</span>
                              <p className="text-muted-foreground">
                                {company.address}
                                {company.city && `, ${company.city}`}
                                {company.postal_code && ` ${company.postal_code}`}
                              </p>
                            </div>
                          )}
                          
                          {company.vat_number && (
                            <div>
                              <span className="font-medium">TVA:</span>
                              <span className="ml-2 font-mono text-muted-foreground">
                                {company.vat_number}
                              </span>
                            </div>
                          )}
                          
                          {(company.siren || company.siret) && (
                            <div>
                              <span className="font-medium">
                                {company.siret ? 'SIRET:' : 'SIREN:'}
                              </span>
                              <span className="ml-2 font-mono text-muted-foreground">
                                {company.siret || company.siren}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          {company.sector && (
                            <div>
                              <span className="font-medium">Secteur:</span>
                              <span className="ml-2 text-muted-foreground">{company.sector}</span>
                            </div>
                          )}
                          
                          {company.creation_date && (
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3 w-3" />
                              <span className="font-medium">Créée:</span>
                              <span className="text-muted-foreground">{company.creation_date}</span>
                            </div>
                          )}
                          
                          {company.employee_count && (
                            <div className="flex items-center gap-2">
                              <Users className="h-3 w-3" />
                              <span className="font-medium">Employés:</span>
                              <span className="text-muted-foreground">{company.employee_count}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {selectedCompany && (
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setSelectedCompany(null)}>
                  Annuler la sélection
                </Button>
                <Button onClick={handleConfirmSelection}>
                  Utiliser cette entreprise
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};