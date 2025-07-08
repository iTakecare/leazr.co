import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Building2, Calculator, FileText, Headphones, Zap, Sparkles, Users } from "lucide-react";

interface Module {
  id: string;
  slug: string;
  name: string;
  description: string;
  is_core: boolean;
}

interface ModuleSelectionStepProps {
  modules: Module[];
  selectedModules: string[];
  setSelectedModules: (modules: string[]) => void;
}

const moduleIcons: Record<string, React.ReactNode> = {
  crm: <Users className="h-6 w-6" />,
  catalog: <Building2 className="h-6 w-6" />,
  calculator: <Calculator className="h-6 w-6" />,
  contracts: <FileText className="h-6 w-6" />,
  support: <Headphones className="h-6 w-6" />,
  fleet_generator: <Zap className="h-6 w-6" />,
  ai_assistant: <Sparkles className="h-6 w-6" />,
};

export const ModuleSelectionStep: React.FC<ModuleSelectionStepProps> = ({
  modules,
  selectedModules,
  setSelectedModules,
}) => {
  const toggleModule = (moduleSlug: string) => {
    setSelectedModules(
      selectedModules.includes(moduleSlug)
        ? selectedModules.filter(m => m !== moduleSlug)
        : [...selectedModules, moduleSlug]
    );
  };

  const coreModules = modules.filter(m => m.is_core);
  const optionalModules = modules.filter(m => !m.is_core);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground">Choisissez vos modules</h2>
        <p className="text-muted-foreground">Sélectionnez les fonctionnalités qui correspondent à vos besoins</p>
      </div>

      {/* Modules essentiels */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-foreground">Modules essentiels</h3>
          <Badge variant="secondary">Inclus</Badge>
        </div>
        <div className="grid gap-3">
          {coreModules.map((module) => (
            <Card 
              key={module.id} 
              className="border-primary/20 bg-primary/5 cursor-not-allowed"
            >
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex-shrink-0 text-primary">
                  {moduleIcons[module.slug] || <Building2 className="h-6 w-6" />}
                </div>
                <div className="flex-grow">
                  <h4 className="font-medium text-foreground">{module.name}</h4>
                  <p className="text-sm text-muted-foreground">{module.description}</p>
                </div>
                <div className="flex-shrink-0">
                  <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
                    <Check className="h-4 w-4 text-primary-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Modules optionnels */}
      {optionalModules.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-foreground">Modules optionnels</h3>
          <div className="grid gap-3">
            {optionalModules.map((module) => {
              const isSelected = selectedModules.includes(module.slug);
              return (
                <Card 
                  key={module.id} 
                  className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                    isSelected 
                      ? 'border-primary bg-primary/5 shadow-sm' 
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => toggleModule(module.slug)}
                >
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className={`flex-shrink-0 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}>
                      {moduleIcons[module.slug] || <Building2 className="h-6 w-6" />}
                    </div>
                    <div className="flex-grow">
                      <h4 className="font-medium text-foreground">{module.name}</h4>
                      <p className="text-sm text-muted-foreground">{module.description}</p>
                    </div>
                    <div className="flex-shrink-0">
                      <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                        isSelected 
                          ? 'bg-primary border-primary' 
                          : 'border-muted-foreground/30 hover:border-primary'
                      }`}>
                        {isSelected && <Check className="h-4 w-4 text-primary-foreground" />}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};