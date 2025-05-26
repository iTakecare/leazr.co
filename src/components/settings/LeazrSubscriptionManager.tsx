
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Building2, Crown, Calendar, Zap } from "lucide-react";

const LeazrSubscriptionManager = () => {
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [subscriptionData, setSubscriptionData] = useState({
    plan: "business",
    duration: "12", // months
    is_active: true
  });

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('name');

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('Error fetching companies:', error);
      toast.error('Erreur lors du chargement des entreprises');
    }
  };

  const assignSubscription = async () => {
    if (!selectedCompanyId) {
      toast.error('Veuillez sélectionner une entreprise');
      return;
    }

    setLoading(true);
    try {
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + parseInt(subscriptionData.duration));

      const { error } = await supabase
        .from('companies')
        .update({
          plan: subscriptionData.plan,
          is_active: subscriptionData.is_active,
          subscription_ends_at: endDate.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedCompanyId);

      if (error) throw error;

      toast.success('Abonnement assigné avec succès');
      fetchCompanies(); // Refresh the list
      setSelectedCompanyId("");
    } catch (error) {
      console.error('Error assigning subscription:', error);
      toast.error('Erreur lors de l\'assignation de l\'abonnement');
    } finally {
      setLoading(false);
    }
  };

  const assignToITakecare = async () => {
    setLoading(true);
    try {
      // Find iTakecare company or create it
      let itakecareCompany = companies.find(c => 
        c.name.toLowerCase().includes('itakecare') || 
        c.name.toLowerCase().includes('i take care')
      );

      if (!itakecareCompany) {
        // Create iTakecare company
        const { data, error } = await supabase
          .from('companies')
          .insert({
            name: 'iTakecare',
            plan: 'business',
            is_active: true,
            subscription_ends_at: new Date(2030, 11, 31).toISOString() // 31 Dec 2030
          })
          .select()
          .single();

        if (error) throw error;
        itakecareCompany = data;
      } else {
        // Update existing iTakecare company
        const { error } = await supabase
          .from('companies')
          .update({
            plan: 'business',
            is_active: true,
            subscription_ends_at: new Date(2030, 11, 31).toISOString(), // 31 Dec 2030
            updated_at: new Date().toISOString()
          })
          .eq('id', itakecareCompany.id);

        if (error) throw error;
      }

      toast.success('Abonnement Business attribué à iTakecare jusqu\'en 2030');
      fetchCompanies();
    } catch (error) {
      console.error('Error assigning subscription to iTakecare:', error);
      toast.error('Erreur lors de l\'assignation de l\'abonnement iTakecare');
    } finally {
      setLoading(false);
    }
  };

  const getPlanBadge = (plan: string, isActive: boolean) => {
    if (!isActive) {
      return <Badge variant="secondary">Inactif</Badge>;
    }

    switch (plan) {
      case 'starter':
        return <Badge className="bg-blue-100 text-blue-800">Starter</Badge>;
      case 'pro':
        return <Badge className="bg-purple-100 text-purple-800">Pro</Badge>;
      case 'business':
        return <Badge className="bg-green-100 text-green-800">Business</Badge>;
      default:
        return <Badge variant="secondary">{plan}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Quick iTakecare Assignment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-500" />
            Abonnement iTakecare
          </CardTitle>
          <CardDescription>
            Attribuer rapidement un abonnement Business complet à iTakecare
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={assignToITakecare}
            disabled={loading}
            className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
          >
            <Zap className="h-4 w-4 mr-2" />
            Attribuer un abonnement Business à iTakecare (jusqu'en 2030)
          </Button>
        </CardContent>
      </Card>

      {/* Manual Assignment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Gestion manuelle des abonnements
          </CardTitle>
          <CardDescription>
            Attribuer ou modifier des abonnements pour toutes les entreprises
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company">Entreprise</Label>
              <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une entreprise" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name} - {getPlanBadge(company.plan, company.is_active)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan">Plan d'abonnement</Label>
              <Select value={subscriptionData.plan} onValueChange={(value) => 
                setSubscriptionData(prev => ({ ...prev, plan: value }))
              }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Durée (mois)</Label>
              <Input
                id="duration"
                type="number"
                value={subscriptionData.duration}
                onChange={(e) => setSubscriptionData(prev => ({ ...prev, duration: e.target.value }))}
                min="1"
                max="120"
              />
            </div>
          </div>

          <Button 
            onClick={assignSubscription}
            disabled={loading || !selectedCompanyId}
            className="w-full"
          >
            Attribuer l'abonnement
          </Button>
        </CardContent>
      </Card>

      {/* Companies List */}
      <Card>
        <CardHeader>
          <CardTitle>Entreprises enregistrées</CardTitle>
          <CardDescription>
            Liste de toutes les entreprises et leurs abonnements actuels
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {companies.map((company) => (
              <div key={company.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium">{company.name}</div>
                  <div className="text-sm text-gray-500">
                    {company.subscription_ends_at && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Expire le: {new Date(company.subscription_ends_at).toLocaleDateString('fr-FR')}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getPlanBadge(company.plan, company.is_active)}
                </div>
              </div>
            ))}
            {companies.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Aucune entreprise trouvée
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LeazrSubscriptionManager;
