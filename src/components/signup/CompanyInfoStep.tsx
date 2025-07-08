import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building, Users } from "lucide-react";

interface CompanyInfoStepProps {
  company: string;
  setCompany: (value: string) => void;
  role: string;
  setRole: (value: string) => void;
  isExistingClient: boolean;
  clientInfo: any;
}

export const CompanyInfoStep: React.FC<CompanyInfoStepProps> = ({
  company,
  setCompany,
  role,
  setRole,
  isExistingClient,
  clientInfo,
}) => {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground">Votre entreprise</h2>
        <p className="text-muted-foreground">Finalisez votre profil d'entreprise</p>
      </div>

      {isExistingClient && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <p className="text-sm text-green-800 font-medium">Client existant détecté</p>
          </div>
          <p className="text-sm text-green-700 mt-1">
            Bienvenue {clientInfo?.name}! Certains champs ont été pré-remplis automatiquement.
          </p>
        </div>
      )}
      
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="company">Nom de l'entreprise</Label>
          <div className="relative">
            <Building className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="company"
              placeholder="Votre Entreprise SARL"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className={`pl-10 ${isExistingClient && clientInfo?.company ? 'border-green-500' : ''}`}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="role">Votre rôle</Label>
          <div className="relative">
            <Users className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10" />
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="pl-10">
                <SelectValue placeholder="Sélectionnez votre rôle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Dirigeant / Administrateur</SelectItem>
                <SelectItem value="partner">Partenaire commercial</SelectItem>
                <SelectItem value="ambassador">Ambassadeur / Apporteur d'affaires</SelectItem>
                <SelectItem value="client">Responsable achats / IT</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
          <h4 className="font-medium text-foreground mb-2">🎉 Votre essai gratuit inclut :</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• 14 jours d'accès complet</li>
            <li>• Tous les modules sélectionnés</li>
            <li>• Support par email</li>
            <li>• Aucun engagement</li>
          </ul>
        </div>
      </div>
    </div>
  );
};