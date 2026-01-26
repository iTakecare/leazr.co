import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/context/AuthContext';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { toast } from 'sonner';
import { BarChart3, Users, LayoutDashboard } from 'lucide-react';

const UpdateProfile: React.FC = () => {
  const { user } = useAuth();
  const { preferences, updateDefaultDashboard, isLoading: prefsLoading } = useUserPreferences();
  
  const [formData, setFormData] = useState({
    firstName: user?.user_metadata?.first_name || '',
    lastName: user?.user_metadata?.last_name || '',
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [defaultDashboard, setDefaultDashboard] = useState<'financial' | 'commercial'>('financial');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (preferences?.default_dashboard) {
      setDefaultDashboard(preferences.default_dashboard);
    }
  }, [preferences]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleDashboardChange = async (value: 'financial' | 'commercial') => {
    setDefaultDashboard(value);
    const success = await updateDefaultDashboard(value);
    if (success) {
      toast.success('Dashboard par défaut mis à jour');
    } else {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.newPassword !== formData.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    setLoading(true);
    try {
      // TODO: Implement profile update logic
      toast.success('Profil mis à jour avec succès !');
    } catch (error) {
      toast.error('Erreur lors de la mise à jour du profil');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* Préférences Dashboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LayoutDashboard className="h-5 w-5" />
            Préférences Dashboard
          </CardTitle>
          <CardDescription>
            Choisissez quel dashboard afficher par défaut à la connexion
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="defaultDashboard">Dashboard par défaut</Label>
            <Select 
              value={defaultDashboard} 
              onValueChange={(value) => handleDashboardChange(value as 'financial' | 'commercial')}
              disabled={prefsLoading}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sélectionner un dashboard" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="financial">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    <span>Financier</span>
                  </div>
                </SelectItem>
                <SelectItem value="commercial">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>Commercial</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Ce dashboard sera affiché automatiquement lorsque vous accédez à la page d'accueil.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Informations du profil */}
      <Card>
        <CardHeader>
          <CardTitle>Mettre à jour le profil</CardTitle>
          <CardDescription>
            Modifiez vos informations personnelles et votre mot de passe
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">Prénom</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="lastName">Nom</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
              />
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-medium mb-4">Changer le mot de passe</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="currentPassword">Mot de passe actuel</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={formData.currentPassword}
                    onChange={(e) => handleInputChange('currentPassword', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="newPassword">Nouveau mot de passe</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={formData.newPassword}
                    onChange={(e) => handleInputChange('newPassword', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="confirmPassword">Confirmer le nouveau mot de passe</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  />
                </div>
              </div>
            </div>

            <Button type="submit" disabled={loading}>
              {loading ? 'Mise à jour...' : 'Mettre à jour'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default UpdateProfile;
