import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, User } from "lucide-react";

interface PersonalInfoStepProps {
  firstName: string;
  setFirstName: (value: string) => void;
  lastName: string;
  setLastName: (value: string) => void;
  email: string;
  setEmail: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  isExistingClient: boolean;
}

export const PersonalInfoStep: React.FC<PersonalInfoStepProps> = ({
  firstName,
  setFirstName,
  lastName,
  setLastName,
  email,
  setEmail,
  password,
  setPassword,
  isExistingClient,
}) => {
  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-foreground">Informations personnelles</h2>
        <p className="text-muted-foreground">Commencez par vos informations de base</p>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">Prénom</Label>
          <div className="relative">
            <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="firstName"
              placeholder="Jean"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="pl-10"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Nom</Label>
          <div className="relative">
            <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="lastName"
              placeholder="Dupont"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="pl-10"
              required
            />
          </div>
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="email">Email professionnel</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            placeholder="jean.dupont@entreprise.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`pl-10 ${isExistingClient ? 'border-green-500' : ''}`}
            required
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="password">Mot de passe</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pl-10"
            required
            minLength={6}
          />
        </div>
        <p className="text-xs text-muted-foreground">Au moins 6 caractères</p>
      </div>
    </div>
  );
};