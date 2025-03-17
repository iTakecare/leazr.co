
import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  Building2, Mail, Phone, FileText, Clock, UserPlus, KeyRound, ChevronLeft, User, CheckCircle, 
  AlertCircle, Info, BadgePercent, Users, Receipt, ReceiptText, Loader2, Edit, Check, Calculator
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAmbassadorById, Ambassador } from "@/services/ambassadorService";
import { createUserAccount, resetPassword } from "@/services/accountService";
import { CommissionLevel, getCommissionLevelWithRates, getCommissionLevels, updateAmbassadorCommissionLevel } from "@/services/commissionService";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AmbassadorDetailParams {
  id?: string;
}

const AmbassadorDetail = () => {
  const { id } = useParams<AmbassadorDetailParams>();
  const navigate = useNavigate();
  const [ambassador, setAmbassador] = useState<Ambassador | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [commissionLevels, setCommissionLevels] = useState<CommissionLevel[]>([]);
  const [selectedCommissionLevelId, setSelectedCommissionLevelId] = useState<string | undefined>(undefined);
  const [isUpdatingCommissionLevel, setIsUpdatingCommissionLevel] = useState(false);
  const [isLevelLoading, setIsLevelLoading] = useState(true);

  useEffect(() => {
    const fetchAmbassador = async () => {
      if (id) {
        try {
          setLoading(true);
          const ambassadorData = await getAmbassadorById(id);
          if (ambassadorData) {
            setAmbassador(ambassadorData);
          } else {
            toast.error("Ambassadeur non trouvé");
            navigate("/ambassadors");
          }
        } catch (error) {
          console.error("Error fetching ambassador:", error);
          toast.error("Erreur lors du chargement de l'ambassadeur");
        } finally {
          setLoading(false);
        }
      }
    };

    fetchAmbassador();
  }, [id, navigate]);

  useEffect(() => {
    const fetchCommissionLevels = async () => {
      try {
        setIsLevelLoading(true);
        const levels = await getCommissionLevels();
        setCommissionLevels(levels);
      } catch (error) {
        console.error("Error fetching commission levels:", error);
        toast.error("Erreur lors du chargement des niveaux de commission");
      } finally {
        setIsLevelLoading(false);
      }
    };

    fetchCommissionLevels();
  }, []);

  useEffect(() => {
    if (ambassador && ambassador.commission_level_id) {
      setSelectedCommissionLevelId(ambassador.commission_level_id);
    }
  }, [ambassador]);

  const handleCreateUser = async () => {
    if (!ambassador) return;

    setIsCreatingUser(true);
    try {
      await createUserAccount(ambassador.id, "ambassador");
      toast.success("Compte utilisateur créé avec succès. Un email a été envoyé à l'ambassadeur.");
      setAmbassador({ ...ambassador, has_user_account: true, user_account_created_at: new Date().toISOString() });
      setShowCreateUser(false);
    } catch (error) {
      console.error("Error creating user account:", error);
      toast.error("Erreur lors de la création du compte utilisateur");
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleResetPassword = async () => {
    if (!ambassador) return;

    setIsResettingPassword(true);
    try {
      await resetPassword(ambassador.email);
      toast.success("Mot de passe réinitialisé avec succès. Un email a été envoyé à l'ambassadeur.");
      setShowResetPassword(false);
    } catch (error) {
      console.error("Error resetting password:", error);
      toast.error("Erreur lors de la réinitialisation du mot de passe");
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleCommissionLevelChange = async (levelId: string) => {
    if (!ambassador) return;

    setSelectedCommissionLevelId(levelId);
    setIsUpdatingCommissionLevel(true);

    try {
      await updateAmbassadorCommissionLevel(ambassador.id, levelId);
      setAmbassador({ ...ambassador, commission_level_id: levelId });
      toast.success("Niveau de commission mis à jour avec succès");
    } catch (error) {
      console.error("Error updating commission level:", error);
      toast.error("Erreur lors de la mise à jour du niveau de commission");
    } finally {
      setIsUpdatingCommissionLevel(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Chargement...
    </div>;
  }

  if (!ambassador) {
    return <div>Ambassadeur non trouvé.</div>;
  }

  return (
    <div className="py-8 px-4 max-w-[1400px] mx-auto">
      <div className="flex justify-between items-center bg-muted/30 p-4 rounded-lg mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{ambassador.name}</h1>
          <p className="text-muted-foreground text-lg">Ambassadeur</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/ambassadors")} className="flex items-center">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Retour
          </Button>
          <Link to={`/calculator/ambassador/${id}`}>
            <Button variant="outline" className="flex items-center">
              <Calculator className="mr-1 h-4 w-4" />
              Calculateur
            </Button>
          </Link>
          <Link to={`/ambassadors/edit/${id}`}>
            <Button className="shadow-sm flex items-center gap-2">
              <Edit className="h-4 w-4" />
              Modifier
            </Button>
          </Link>
        </div>
      </div>

      <Tabs defaultValue="informations" className="w-full space-y-4">
        <TabsList>
          <TabsTrigger value="informations">Informations</TabsTrigger>
          <TabsTrigger value="commissions">Commissions</TabsTrigger>
          <TabsTrigger value="accounts">Compte</TabsTrigger>
        </TabsList>
        <TabsContent value="informations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Détails de l'ambassadeur</CardTitle>
              <CardDescription>Informations générales sur l'ambassadeur.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center space-x-4">
                <User className="h-10 w-10 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium leading-none">{ambassador.name}</p>
                  <p className="text-sm text-muted-foreground">Ambassadeur</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="space-y-1">
                  <Label>Email</Label>
                  <p className="text-sm font-medium">{ambassador.email}</p>
                </div>
                <div className="space-y-1">
                  <Label>Téléphone</Label>
                  <p className="text-sm font-medium">{ambassador.phone || "Non spécifié"}</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="space-y-1">
                  <Label>Adresse</Label>
                  <p className="text-sm font-medium">{ambassador.address || "Non spécifiée"}</p>
                </div>
                <div className="space-y-1">
                  <Label>Société</Label>
                  <p className="text-sm font-medium">{ambassador.company || "Non spécifiée"}</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="space-y-1">
                  <Label>Date de création</Label>
                  <p className="text-sm font-medium">
                    {ambassador.created_at ? format(new Date(ambassador.created_at), "dd MMMM yyyy", { locale: fr }) : "Non spécifiée"}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label>Informations supplémentaires</Label>
                  <p className="text-sm font-medium">{ambassador.notes || "Aucune"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="commissions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Commissions</CardTitle>
              <CardDescription>Gestion des commissions de l'ambassadeur.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <BadgePercent className="h-4 w-4" />
                  <h4 className="text-sm font-semibold">Niveau de commission actuel:</h4>
                  {isLevelLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Badge variant="secondary">
                      {commissionLevels.find(level => level.id === ambassador.commission_level_id)?.name || "Non défini"}
                    </Badge>
                  )}
                </div>
                <div>
                  <Label>Changer le niveau de commission</Label>
                  <Select onValueChange={handleCommissionLevelChange} defaultValue={selectedCommissionLevelId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un niveau" />
                    </SelectTrigger>
                    <SelectContent>
                      {commissionLevels.map((level) => (
                        <SelectItem key={level.id} value={level.id}>{level.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isUpdatingCommissionLevel && (
                    <div className="mt-2 text-sm text-muted-foreground">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Mise à jour du niveau de commission...
                    </div>
                  )}
                </div>
                <div className="border rounded-md p-4">
                  <h4 className="text-sm font-semibold mb-2">Historique des commissions</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Montant</TableHead>
                        <TableHead>Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium">12/05/2024</TableCell>
                        <TableCell>150€</TableCell>
                        <TableCell>Commission sur vente #123</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">01/05/2024</TableCell>
                        <TableCell>200€</TableCell>
                        <TableCell>Commission sur vente #124</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="accounts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Gestion du compte</CardTitle>
              <CardDescription>Gérer le compte utilisateur de l'ambassadeur.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {ambassador.has_user_account ? (
                <div className="rounded-md border p-4">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <p className="text-sm font-medium">Un compte utilisateur a été créé pour cet ambassadeur le {format(new Date(ambassador.user_account_created_at!), "dd MMMM yyyy", { locale: fr })}.</p>
                  </div>
                  <Button variant="secondary" size="sm" className="mt-4" onClick={() => setShowResetPassword(true)}>
                    <KeyRound className="mr-2 h-4 w-4" />
                    Réinitialiser le mot de passe
                  </Button>
                </div>
              ) : (
                <div className="rounded-md border p-4">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                    <p className="text-sm font-medium">Aucun compte utilisateur n'a été créé pour cet ambassadeur.</p>
                  </div>
                  <Button variant="secondary" size="sm" className="mt-4" onClick={() => setShowCreateUser(true)}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Créer un compte utilisateur
                  </Button>
                </div>
              )}

              {showCreateUser && (
                <div className="rounded-md border p-4">
                  <Info className="h-4 w-4 text-blue-500 mb-2" />
                  <p className="text-sm font-medium">Êtes-vous sûr de vouloir créer un compte utilisateur pour cet ambassadeur ? Un email sera envoyé à l'ambassadeur avec les instructions de connexion.</p>
                  <div className="flex justify-end space-x-2 mt-4">
                    <Button variant="ghost" size="sm" onClick={() => setShowCreateUser(false)}>Annuler</Button>
                    <Button variant="secondary" size="sm" onClick={handleCreateUser} disabled={isCreatingUser}>
                      {isCreatingUser ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Création...
                        </>
                      ) : (
                        "Créer le compte"
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {showResetPassword && (
                <div className="rounded-md border p-4">
                  <Info className="h-4 w-4 text-blue-500 mb-2" />
                  <p className="text-sm font-medium">Êtes-vous sûr de vouloir réinitialiser le mot de passe de cet ambassadeur ? Un email sera envoyé à l'ambassadeur avec les instructions pour créer un nouveau mot de passe.</p>
                  <div className="flex justify-end space-x-2 mt-4">
                    <Button variant="ghost" size="sm" onClick={() => setShowResetPassword(false)}>Annuler</Button>
                    <Button variant="secondary" size="sm" onClick={handleResetPassword} disabled={isResettingPassword}>
                      {isResettingPassword ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Réinitialisation...
                        </>
                      ) : (
                        "Réinitialiser le mot de passe"
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AmbassadorDetail;
