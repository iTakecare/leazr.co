import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit, Plus, Search, Leaf, Activity, Droplets, Trash2 } from "lucide-react";
import { useEnvironmentalData } from "@/hooks/environmental/useEnvironmentalData";
import { useCompanyDetection } from "@/hooks/useCompanyDetection";
import CategoryEnvironmentalForm from "./CategoryEnvironmentalForm";
import EnvironmentalDataTable from "./EnvironmentalDataTable";

const EnvironmentalDataManager: React.FC = () => {
  const { companySlug } = useCompanyDetection();
  const { data: environmentalData, isLoading } = useEnvironmentalData(companySlug);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  const categories = environmentalData?.categories || [];
  
  // Filter categories based on search
  const filteredCategories = categories.filter(cat => 
    cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cat.translation.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEditCategory = (categoryId: string) => {
    setSelectedCategory(categoryId);
  };

  const handleCloseForm = () => {
    setSelectedCategory(null);
    setShowAddForm(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
          <p className="text-muted-foreground">Chargement des données environnementales...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Données Environnementales</h1>
          <p className="text-muted-foreground">
            Gérez les données d'impact CO2 et environnemental de vos catégories de produits
          </p>
        </div>
        <Button onClick={() => setShowAddForm(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Ajouter des données
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center space-x-2">
              <Leaf className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">
                  {categories.reduce((sum, cat) => sum + (cat.co2_savings_kg || 0), 0).toFixed(0)}
                </p>
                <p className="text-xs text-muted-foreground">Total kg CO2 économisés</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center space-x-2">
              <Activity className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{categories.length}</p>
                <p className="text-xs text-muted-foreground">Catégories configurées</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center space-x-2">
              <Droplets className="h-8 w-8 text-cyan-500" />
              <div>
                <p className="text-2xl font-bold">
                  {categories.filter(cat => cat.environmental_impact?.water_savings_liters && cat.environmental_impact.water_savings_liters > 0).length}
                </p>
                <p className="text-xs text-muted-foreground">Avec économies d'eau</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-yellow-500 rounded-full flex items-center justify-center text-white font-bold">
                ⚡
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {categories.filter(cat => cat.environmental_impact?.energy_savings_kwh && cat.environmental_impact.energy_savings_kwh > 0).length}
                </p>
                <p className="text-xs text-muted-foreground">Avec économies d'énergie</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="table" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="table">Vue Tableau</TabsTrigger>
          <TabsTrigger value="cards">Vue Cartes</TabsTrigger>
        </TabsList>
        
        <TabsContent value="table" className="space-y-4">
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher une catégorie..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
          </div>
          
          <EnvironmentalDataTable 
            categories={filteredCategories}
            onEdit={handleEditCategory}
          />
        </TabsContent>
        
        <TabsContent value="cards" className="space-y-4">
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher une catégorie..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCategories.map((category) => (
              <Card key={category.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{category.translation}</CardTitle>
                    <Badge variant="secondary">{category.name}</Badge>
                  </div>
                  <CardDescription>
                    Impact environnemental pour la catégorie {category.translation}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <Leaf className="h-4 w-4 text-green-500" />
                      <span>{category.co2_savings_kg || 0} kg CO2</span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <div className="h-4 w-4 bg-blue-500 rounded-full"></div>
                      <span>{category.environmental_impact?.water_savings_liters || 0}L eau</span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <div className="h-4 w-4 bg-yellow-500 rounded-full"></div>
                      <span>{category.environmental_impact?.energy_savings_kwh || 0} kWh</span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <div className="h-4 w-4 bg-orange-500 rounded-full"></div>
                      <span>{category.environmental_impact?.waste_reduction_kg || 0} kg déchets</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-xs text-muted-foreground">
                      Source: {category.environmental_impact?.source_url?.includes('impactco2') ? 'Impact CO2' : 'Données personnalisées'}
                    </span>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleEditCategory(category.id)}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Form Modal */}
      {(selectedCategory || showAddForm) && (
        <CategoryEnvironmentalForm
          categoryId={selectedCategory}
          onClose={handleCloseForm}
        />
      )}
    </div>
  );
};

export default EnvironmentalDataManager;