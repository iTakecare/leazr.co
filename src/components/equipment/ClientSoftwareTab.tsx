import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Monitor, Apple, Package, Clock, CheckCircle2, XCircle, Loader2, AlertCircle } from "lucide-react";
import { useMultiTenant } from "@/hooks/useMultiTenant";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import SoftwareDeploymentWizard from "./SoftwareDeploymentWizard";

interface ClientSoftwareTabProps {
  clientId: string;
  companyId: string;
  equipment: Array<{
    id: string;
    name: string;
    contractRef: string;
  }>;
}

const platformIcon = (platform: string) => {
  switch (platform?.toLowerCase()) {
    case "macos": return <Apple className="h-4 w-4" />;
    case "windows": return <Monitor className="h-4 w-4" />;
    default: return <Package className="h-4 w-4" />;
  }
};

const statusConfig: Record<string, { icon: React.ReactNode; label: string; className: string }> = {
  pending: { icon: <Clock className="h-3.5 w-3.5" />, label: "En attente", className: "bg-amber-100 text-amber-700 border-amber-200" },
  installing: { icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />, label: "Installation...", className: "bg-blue-100 text-blue-700 border-blue-200" },
  success: { icon: <CheckCircle2 className="h-3.5 w-3.5" />, label: "Installé", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  failed: { icon: <XCircle className="h-3.5 w-3.5" />, label: "Échoué", className: "bg-red-100 text-red-700 border-red-200" },
};

const ClientSoftwareTab: React.FC<ClientSoftwareTabProps> = ({ clientId, companyId, equipment }) => {
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string>("");
  const [deployWizardOpen, setDeployWizardOpen] = useState(false);

  // Fetch available software catalog
  const { data: softwareList = [], isLoading: loadingSoftware } = useQuery({
    queryKey: ["client-software-catalog", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("software_catalog")
        .select("*")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  // Fetch deployment history
  const { data: deployments = [], isLoading: loadingDeployments } = useQuery({
    queryKey: ["client-software-deployments", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("software_deployments")
        .select("*, software_catalog(name, platform, icon_url)")
        .eq("company_id", companyId)
        .order("initiated_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const selectedEquipment = equipment.find(e => e.id === selectedEquipmentId);

  const categoryGroups = softwareList.reduce((acc: Record<string, typeof softwareList>, sw) => {
    const cat = sw.category || "Autre";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(sw);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Equipment selector */}
      <Card className="border-0 shadow-sm rounded-2xl">
        <CardHeader className="bg-muted/30 border-b rounded-t-2xl pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Download className="h-5 w-5 text-primary" />
            Déploiement de logiciels
          </CardTitle>
          <CardDescription className="text-xs">
            Sélectionnez un équipement cible puis installez les logiciels souhaités.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">
              Équipement cible :
            </label>
            <Select value={selectedEquipmentId} onValueChange={setSelectedEquipmentId}>
              <SelectTrigger className="max-w-sm rounded-xl">
                <SelectValue placeholder="Choisir un équipement..." />
              </SelectTrigger>
              <SelectContent>
                {equipment.length === 0 ? (
                  <SelectItem value="none" disabled>Aucun équipement disponible</SelectItem>
                ) : (
                  equipment.map(eq => (
                    <SelectItem key={eq.id} value={eq.id}>
                      {eq.name} ({eq.contractRef})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {selectedEquipment && (
              <Button
                size="sm"
                className="gap-1.5 rounded-xl"
                onClick={() => setDeployWizardOpen(true)}
              >
                <Download className="h-4 w-4" />
                Installer des logiciels
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Software catalog grid */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Logiciels disponibles</h3>
        {loadingSoftware ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : softwareList.length === 0 ? (
          <Card className="border-0 shadow-sm rounded-2xl">
            <CardContent className="py-12 text-center">
              <Package className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
              <p className="text-sm text-muted-foreground">Aucun logiciel disponible dans le catalogue</p>
            </CardContent>
          </Card>
        ) : (
          Object.entries(categoryGroups).map(([category, items]) => (
            <div key={category} className="space-y-2">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{category}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {items.map(sw => (
                  <Card key={sw.id} className="border-0 shadow-sm rounded-2xl hover:shadow-md transition-shadow">
                    <CardContent className="p-4 flex items-start gap-3">
                      <div className="h-10 w-10 rounded-xl bg-muted/60 flex items-center justify-center shrink-0">
                        {sw.icon_url ? (
                          <img src={sw.icon_url} alt={sw.name} className="h-6 w-6 object-contain" />
                        ) : (
                          platformIcon(sw.platform)
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{sw.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {sw.version && (
                            <span className="text-xs text-muted-foreground">v{sw.version}</span>
                          )}
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {sw.platform}
                          </Badge>
                        </div>
                        {sw.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{sw.description}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Deployment history */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Historique des déploiements</h3>
        {loadingDeployments ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : deployments.length === 0 ? (
          <Card className="border-0 shadow-sm rounded-2xl">
            <CardContent className="py-8 text-center">
              <Clock className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-40" />
              <p className="text-sm text-muted-foreground">Aucun déploiement effectué</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-0 shadow-sm rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left text-xs font-medium text-muted-foreground p-3">Logiciel</th>
                    <th className="text-left text-xs font-medium text-muted-foreground p-3">Plateforme</th>
                    <th className="text-left text-xs font-medium text-muted-foreground p-3">Statut</th>
                    <th className="text-left text-xs font-medium text-muted-foreground p-3">Date</th>
                    <th className="text-left text-xs font-medium text-muted-foreground p-3">Erreur</th>
                  </tr>
                </thead>
                <tbody>
                  {deployments.map((dep: any) => {
                    const status = statusConfig[dep.status] || statusConfig.pending;
                    const sw = dep.software_catalog;
                    return (
                      <tr key={dep.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="p-3 text-sm font-medium">{sw?.name || "—"}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            {platformIcon(sw?.platform || "")}
                            {sw?.platform || "—"}
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge variant="outline" className={`gap-1 text-xs ${status.className}`}>
                            {status.icon}
                            {status.label}
                          </Badge>
                        </td>
                        <td className="p-3 text-xs text-muted-foreground">
                          {new Date(dep.initiated_at).toLocaleDateString("fr-FR", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="p-3">
                          {dep.error_message ? (
                            <span className="text-xs text-destructive truncate max-w-[200px] block" title={dep.error_message}>
                              {dep.error_message}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* Deployment wizard */}
      {selectedEquipment && (
        <SoftwareDeploymentWizard
          open={deployWizardOpen}
          onOpenChange={setDeployWizardOpen}
          equipment={selectedEquipment}
        />
      )}
    </div>
  );
};

export default ClientSoftwareTab;
