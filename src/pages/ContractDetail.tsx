import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft, FileText, Send, Package, Truck, Play, AlarmClock, MoreHorizontal, CheckCircle, Calendar, BoxIcon } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Contract, contractStatuses, getContracts, updateContractStatus, addTrackingNumber, getContractWorkflowLogs } from "@/services/contractService";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import ContractStatusBadge from "@/components/contracts/ContractStatusBadge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import PageTransition from "@/components/layout/PageTransition";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ContractDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState<string>('');
  const [statusChangeReason, setStatusChangeReason] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [trackingDialogOpen, setTrackingDialogOpen] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [estimatedDelivery, setEstimatedDelivery] = useState('');
  const [carrier, setCarrier] = useState('');
  const [equipmentItems, setEquipmentItems] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [activeTab, setActiveTab] = useState("details");

  const fetchContractDetails = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      setLoadingError(null);
      
      console.log("Chargement des détails du contrat:", id);
      
      const contractsData = await getContracts(true);
      const contractData = contractsData.find(c => c.id === id);
      
      if (!contractData) {
        console.error("Contrat non trouvé dans les données récupérées");
        setLoadingError("Le contrat n'a pas été trouvé.");
        return;
      }
      
      console.log("Contrat trouvé:", contractData);
      setContract(contractData);
      
      await fetchLogs();
      
      if (contractData.equipment_description) {
        try {
          const parsedEquipment = typeof contractData.equipment_description === 'string' 
            ? JSON.parse(contractData.equipment_description) 
            : contractData.equipment_description;
            
          if (Array.isArray(parsedEquipment)) {
            setEquipmentItems(parsedEquipment);
          }
        } catch (e) {
          console.error("Erreur lors de l'analyse des données d'équipement:", e);
        }
      }
    } catch (error) {
      console.error("Erreur lors du chargement des détails du contrat:", error);
      setLoadingError("Erreur lors du chargement des détails du contrat.");
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    if (!id) return;
    
    try {
      setIsLoadingLogs(true);
      
      console.log("Chargement des logs pour le contrat:", id);
      const logsData = await getContractWorkflowLogs(id);
      
      console.log("Logs récupérés:", logsData);
      setLogs(logsData);
    } catch (error) {
      console.error("Erreur lors du chargement des logs:", error);
    } finally {
      setIsLoadingLogs(false);
    }
  };
  
  useEffect(() => {
    fetchContractDetails();
  }, [id]);
  
  const openStatusChangeDialog = (status: string) => {
    setTargetStatus(status);
    setStatusChangeReason('');
    setStatusDialogOpen(true);
  };
  
  const openTrackingDialog = () => {
    setTrackingNumber(contract?.tracking_number || '');
    setEstimatedDelivery(contract?.estimated_delivery || '');
    setCarrier(contract?.delivery_carrier || '');
    setTrackingDialogOpen(true);
  };
  
  const handleStatusChange = async () => {
    if (!contract || !targetStatus) return;
    
    try {
      setIsUpdatingStatus(true);
      
      console.log(`Tentative de changement de statut: ${contract.status} -> ${targetStatus}`);
      
      const success = await updateContractStatus(
        contract.id, 
        targetStatus, 
        contract.status || contractStatuses.CONTRACT_SENT,
        statusChangeReason
      );
      
      if (success) {
        setContract(prevContract => {
          if (!prevContract) return null;
          return {
            ...prevContract,
            status: targetStatus,
            updated_at: new Date().toISOString()
          };
        });
        
        toast.success(`Statut du contrat mis à jour avec succès`);
        setStatusDialogOpen(false);
        
        await fetchLogs();
      } else {
        toast.error("Erreur lors de la mise à jour du statut du contrat");
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour du statut:", error);
      toast.error("Erreur lors de la mise à jour du statut");
    } finally {
      setIsUpdatingStatus(false);
    }
  };
  
  const handleAddTrackingInfo = async () => {
    if (!contract || !trackingNumber) return;
    
    try {
      setIsUpdatingStatus(true);
      
      const currentStatus = contract.status;
      console.log(`Ajout d'informations de suivi au contrat avec statut actuel: "${currentStatus}"`);
      
      const success = await addTrackingNumber(
        contract.id,
        trackingNumber,
        estimatedDelivery,
        carrier
      );
      
      if (success) {
        console.log(`Tracking info added, maintaining current status: "${currentStatus}"`);
        
        setContract(prevContract => {
          if (!prevContract) return null;
          return {
            ...prevContract,
            tracking_number: trackingNumber,
            estimated_delivery: estimatedDelivery,
            delivery_carrier: carrier,
            delivery_status: 'en_attente',
            status: currentStatus,
            updated_at: new Date().toISOString()
          };
        });
        
        toast.success(`Informations de suivi ajoutées avec succès`);
        setTrackingDialogOpen(false);
        
        await fetchLogs();
        await fetchContractDetails();
      } else {
        toast.error("Erreur lors de l'ajout des informations de suivi");
      }
    } catch (error) {
      console.error("Erreur lors de l'ajout des informations de suivi:", error);
      toast.error("Erreur lors de l'ajout des informations de suivi");
    } finally {
      setIsUpdatingStatus(false);
    }
  };
  
  const getAvailableActions = () => {
    if (!contract) return [];
    
    const actions = [];
    
    switch (contract.status) {
      case contractStatuses.CONTRACT_SENT:
        actions.push({
          label: "Marquer comme signé",
          icon: FileText,
          onClick: () => openStatusChangeDialog(contractStatuses.CONTRACT_SIGNED),
        });
        break;
        
      case contractStatuses.CONTRACT_SIGNED:
        actions.push({
          label: "Marquer comme commandé",
          icon: Package,
          onClick: () => openStatusChangeDialog(contractStatuses.EQUIPMENT_ORDERED),
        });
        break;
        
      case contractStatuses.EQUIPMENT_ORDERED:
        actions.push({
          label: "Ajouter numéro de suivi",
          icon: Send,
          onClick: openTrackingDialog,
        });
        
        if (contract.tracking_number) {
          actions.push({
            label: "Marquer comme livré",
            icon: Truck,
            onClick: () => openStatusChangeDialog(contractStatuses.DELIVERED),
          });
        }
        break;
        
      case contractStatuses.DELIVERED:
        actions.push({
          label: "Marquer comme actif",
          icon: Play,
          onClick: () => openStatusChangeDialog(contractStatuses.ACTIVE),
        });
        break;
        
      case contractStatuses.ACTIVE:
        actions.push({
          label: "Marquer comme terminé",
          icon: AlarmClock,
          onClick: () => openStatusChangeDialog(contractStatuses.COMPLETED),
        });
        break;
    }
    
    return actions;
  };
  
  const handleStepClick = (status: string) => {
    if (contract && status !== contract.status) {
      openStatusChangeDialog(status);
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }
  
  if (loadingError || !contract) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="text-red-500 font-medium">{loadingError || "Le contrat n'a pas été trouvé."}</div>
        <Button onClick={() => navigate('/contracts')}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Retour aux contrats
        </Button>
      </div>
    );
  }
  
  const availableActions = getAvailableActions();
  
  return (
    <PageTransition>
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => navigate('/contracts')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold">
              Contrat {`CON-${contract?.id.slice(0, 8)}`}
            </h1>
            {contract && <ContractStatusBadge status={contract.status} />}
          </div>
        </div>
        
        {contract && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6 border">
            <h2 className="text-lg font-medium mb-4">
              Gestion du contrat - Étapes du workflow
            </h2>
            
            <div className="flex flex-wrap gap-3 mb-6">
              {availableActions.map((action, index) => (
                <Button 
                  key={`${action.label}-${index}`}
                  onClick={action.onClick}
                  disabled={isUpdatingStatus}
                  size="lg"
                >
                  <action.icon className="mr-2 h-5 w-5" />
                  {action.label}
                </Button>
              ))}
              
              {availableActions.length === 0 && (
                <div className="text-gray-500 italic p-2">
                  Aucune action disponible pour ce statut de contrat
                </div>
              )}
            </div>
            
            {contract.tracking_number && (
              <div className="bg-blue-50 border border-blue-100 rounded-md p-3 mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <BoxIcon className="h-5 w-5 text-blue-500" />
                  <h3 className="font-medium text-blue-700">Informations de livraison</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  <div className="flex items-center text-blue-700">
                    <span className="font-medium mr-2">Numéro de suivi:</span> {contract.tracking_number}
                  </div>
                  {contract.delivery_carrier && (
                    <div className="flex items-center text-blue-700">
                      <span className="font-medium mr-2">Transporteur:</span> {contract.delivery_carrier}
                    </div>
                  )}
                  {contract.estimated_delivery && (
                    <div className="flex items-center text-blue-700">
                      <span className="font-medium mr-2">Livraison estimée:</span> {contract.estimated_delivery}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div className="mt-4">
              <div className="flex items-center justify-between">
                <ProgressStep 
                  label="Contrat envoyé" 
                  isActive={contract.status === contractStatuses.CONTRACT_SENT}
                  isCompleted={[
                    contractStatuses.CONTRACT_SIGNED, 
                    contractStatuses.EQUIPMENT_ORDERED,
                    contractStatuses.DELIVERED,
                    contractStatuses.ACTIVE,
                    contractStatuses.COMPLETED
                  ].includes(contract.status || '')}
                  status={contractStatuses.CONTRACT_SENT}
                  onClick={handleStepClick}
                />
                <ProgressLine />
                <ProgressStep 
                  label="Contrat signé" 
                  isActive={contract.status === contractStatuses.CONTRACT_SIGNED}
                  isCompleted={[
                    contractStatuses.EQUIPMENT_ORDERED,
                    contractStatuses.DELIVERED,
                    contractStatuses.ACTIVE,
                    contractStatuses.COMPLETED
                  ].includes(contract.status || '')}
                  status={contractStatuses.CONTRACT_SIGNED}
                  onClick={handleStepClick}
                />
                <ProgressLine />
                <ProgressStep 
                  label="Équipement commandé" 
                  isActive={contract.status === contractStatuses.EQUIPMENT_ORDERED}
                  isCompleted={[
                    contractStatuses.DELIVERED,
                    contractStatuses.ACTIVE,
                    contractStatuses.COMPLETED
                  ].includes(contract.status || '')}
                  status={contractStatuses.EQUIPMENT_ORDERED}
                  onClick={handleStepClick}
                />
                <ProgressLine />
                <ProgressStep 
                  label="Livré" 
                  isActive={contract.status === contractStatuses.DELIVERED}
                  isCompleted={[
                    contractStatuses.ACTIVE,
                    contractStatuses.COMPLETED
                  ].includes(contract.status || '')}
                  status={contractStatuses.DELIVERED}
                  onClick={handleStepClick}
                />
                <ProgressLine />
                <ProgressStep 
                  label="Actif" 
                  isActive={contract.status === contractStatuses.ACTIVE}
                  isCompleted={[
                    contractStatuses.COMPLETED
                  ].includes(contract.status || '')}
                  status={contractStatuses.ACTIVE}
                  onClick={handleStepClick}
                />
                <ProgressLine />
                <ProgressStep 
                  label="Terminé" 
                  isActive={contract.status === contractStatuses.COMPLETED}
                  isCompleted={false}
                  status={contractStatuses.COMPLETED}
                  onClick={handleStepClick}
                />
              </div>
            </div>
          </div>
        )}
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Détails du contrat</TabsTrigger>
            <TabsTrigger value="delivery" className={contract?.tracking_number ? "relative" : ""}>
              Livraison
              {contract?.tracking_number && (
                <span className="absolute top-0 right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="history">Historique</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Détails du contrat</CardTitle>
                <CardDescription>Informations concernant ce contrat</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-gray-500">Client</div>
                    <div className="text-lg">{contract.client_name}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">Email</div>
                    <div className="text-lg">{contract.client_email || contract.clients?.email || "Non spécifié"}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">Montant total</div>
                    <div className="text-lg font-medium">{formatCurrency(contract.amount || 0)}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">Paiement mensuel</div>
                    <div className="text-lg">{formatCurrency(contract.monthly_payment || 0)}</div>
                  </div>
                  {contract.lease_duration && (
                    <div>
                      <div className="text-sm font-medium text-gray-500">Durée</div>
                      <div className="text-lg">{contract.lease_duration} mois</div>
                    </div>
                  )}
                  <div>
                    <div className="text-sm font-medium text-gray-500">Bailleur</div>
                    <div className="text-lg">{contract.leaser_name}</div>
                  </div>
                </div>
                
                <Separator className="my-6" />
                
                <div>
                  <h3 className="text-lg font-medium mb-4">Équipements</h3>
                  {equipmentItems.length > 0 ? (
                    <div className="space-y-4">
                      {equipmentItems.map((item, index) => (
                        <div key={item.id || index} className="border p-4 rounded-md">
                          <div className="font-medium">{item.title}</div>
                          <div className="grid grid-cols-3 gap-2 mt-2 text-sm">
                            <div>
                              <span className="text-gray-500">Prix d'achat:</span> {formatCurrency(item.purchasePrice || 0)}
                            </div>
                            <div>
                              <span className="text-gray-500">Quantité:</span> {item.quantity || 1}
                            </div>
                            <div>
                              <span className="text-gray-500">Marge:</span> {item.margin || 0}%
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-gray-500">{contract.equipment_description || "Aucun équipement trouvé"}</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="delivery">
            <Card>
              <CardHeader>
                <CardTitle>Informations de livraison</CardTitle>
                <CardDescription>Détails de suivi et de livraison</CardDescription>
              </CardHeader>
              <CardContent>
                {contract.tracking_number ? (
                  <div className="space-y-6">
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-5">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="bg-blue-100 p-2 rounded-full">
                          <BoxIcon className="h-6 w-6 text-blue-600" />
                        </div>
                        <h3 className="text-xl font-semibold">Suivi de la commande</h3>
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="border bg-white rounded-md p-4">
                          <div className="text-sm font-medium text-gray-500 mb-1">Numéro de suivi</div>
                          <div className="text-lg font-medium">{contract.tracking_number}</div>
                        </div>
                        
                        {contract.delivery_carrier && (
                          <div className="border bg-white rounded-md p-4">
                            <div className="text-sm font-medium text-gray-500 mb-1">Transporteur</div>
                            <div className="text-lg font-medium">{contract.delivery_carrier}</div>
                          </div>
                        )}
                        
                        {contract.estimated_delivery && (
                          <div className="border bg-white rounded-md p-4">
                            <div className="text-sm font-medium text-gray-500 mb-1">Livraison estimée</div>
                            <div className="text-lg font-medium flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-blue-500" />
                              {contract.estimated_delivery}
                            </div>
                          </div>
                        )}
                        
                        <div className="border bg-white rounded-md p-4">
                          <div className="text-sm font-medium text-gray-500 mb-1">Statut</div>
                          <div className="text-lg font-medium">
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 hover:bg-blue-100">
                              En attente de livraison
                            </Badge>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-6 flex justify-end">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-blue-600"
                          onClick={openTrackingDialog}
                        >
                          Modifier les informations de suivi
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
                    <div className="bg-gray-100 p-4 rounded-full">
                      <Truck className="h-12 w-12 text-gray-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium">Aucune information de livraison</h3>
                      <p className="text-gray-500 mt-1">
                        Ajoutez un numéro de suivi pour commencer à suivre cette commande
                      </p>
                    </div>
                    <Button onClick={openTrackingDialog}>
                      <Send className="mr-2 h-4 w-4" />
                      Ajouter un numéro de suivi
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Historique</CardTitle>
                <CardDescription>Modifications de statut</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingLogs ? (
                  <div className="flex justify-center py-6">
                    <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
                  </div>
                ) : logs.length > 0 ? (
                  <div className="space-y-4">
                    {logs.map((log) => (
                      <div key={log.id} className="border-l-2 border-blue-200 pl-4 py-2">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="font-medium">
                            {log.user_name || "Utilisateur"}
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatDate(log.created_at)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm flex-wrap">
                          <span>Statut changé de</span>
                          <ContractStatusBadge status={log.previous_status} />
                          <span>à</span>
                          <ContractStatusBadge status={log.new_status} />
                        </div>
                        {log.reason && (
                          <div className="mt-2 text-sm text-gray-600">
                            {log.reason}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-500">Aucun historique disponible pour le contrat</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Status Change Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Changer le statut du contrat</DialogTitle>
            <DialogDescription>
              Vous pouvez ajouter une note facultative pour ce changement de statut.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Textarea
              placeholder="Note (facultatif)..."
              value={statusChangeReason}
              onChange={(e) => setStatusChangeReason(e.target.value)}
              rows={4}
            />
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleStatusChange} 
              disabled={isUpdatingStatus}
            >
              {isUpdatingStatus ? (
                <>
                  <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent"></span>
                  Mise à jour...
                </>
              ) : "Confirmer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Tracking Dialog */}
      <Dialog open={trackingDialogOpen} onOpenChange={setTrackingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {contract?.tracking_number ? "Modifier les informations de suivi" : "Ajouter un numéro de suivi"}
            </DialogTitle>
            <DialogDescription>
              Renseignez les informations de livraison pour ce contrat.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="grid w-full gap-1.5">
              <label htmlFor="tracking-number" className="text-sm font-medium">
                Numéro de suivi
              </label>
              <Input
                id="tracking-number"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="123456789"
                required
              />
            </div>
            
            <div className="grid w-full gap-1.5">
              <label htmlFor="carrier" className="text-sm font-medium">
                Transporteur
              </label>
              <Input
                id="carrier"
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                placeholder="DHL, UPS, ..."
              />
            </div>
            
            <div className="grid w-full gap-1.5">
              <label htmlFor="delivery-date" className="text-sm font-medium">
                Date de livraison estimée
              </label>
              <Input
                id="delivery-date"
                type="date"
                value={estimatedDelivery}
                onChange={(e) => setEstimatedDelivery(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setTrackingDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleAddTrackingInfo}
              disabled={!trackingNumber.trim() || isUpdatingStatus}
            >
              {isUpdatingStatus ? (
                <>
                  <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent"></span>
                  {contract?.tracking_number ? "Mise à jour..." : "Ajout en cours..."}
                </>
              ) : "Confirmer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
};

const ProgressStep = ({ 
  label, 
  isActive, 
  isCompleted, 
  status,
  onClick
}: { 
  label: string; 
  isActive: boolean; 
  isCompleted: boolean;
  status: string;
  onClick: (status: string) => void;
}) => {
  const getClassName = () => {
    if (isActive) return "bg-blue-600 text-white";
    if (isCompleted) return "bg-green-500 text-white";
    return "bg-gray-200 text-gray-700";
  };
  
  return (
    <div 
      className="flex flex-col items-center cursor-pointer"
      onClick={() => onClick(status)}
    >
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getClassName()}`}>
        {isCompleted ? (
          <CheckCircle className="h-5 w-5" />
        ) : (
          <span>{label.charAt(0)}</span>
        )}
      </div>
      <div className="text-xs mt-1 text-center max-w-[80px]">{label}</div>
    </div>
  );
};

const ProgressLine = () => {
  return (
    <div className="h-0.5 bg-gray-200 flex-grow mx-2"></div>
  );
};

export default ContractDetail;
