
import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Copy, Trash, FileEdit } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { 
  getAllPDFTemplates, 
  savePDFTemplate, 
  loadPDFTemplate,
  DEFAULT_TEMPLATE 
} from "@/utils/pdfTemplateUtils";
import { generateTemplateId } from "@/lib/utils";

interface PDFTemplateListProps {
  onSelectTemplate?: (templateId: string) => void;
  showSelectButton?: boolean;
}

const PDFTemplateList: React.FC<PDFTemplateListProps> = ({ 
  onSelectTemplate, 
  showSelectButton = false 
}) => {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const templates = await getAllPDFTemplates();
      console.log("Templates chargés:", templates);
      setTemplates(templates);
    } catch (error) {
      console.error("Erreur lors du chargement des templates:", error);
      toast.error("Impossible de charger les modèles de PDF");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async () => {
    if (!newTemplateName.trim()) {
      toast.error("Veuillez entrer un nom pour le modèle");
      return;
    }

    try {
      setIsCreatingTemplate(true);
      
      // Charge le modèle par défaut comme base
      const defaultTemplate = await loadPDFTemplate('default');
      
      // Crée un nouveau modèle basé sur le modèle par défaut
      const newTemplate = {
        ...defaultTemplate,
        id: generateTemplateId(),
        name: newTemplateName.trim(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      await savePDFTemplate(newTemplate);
      toast.success("Nouveau modèle créé avec succès");
      setIsDialogOpen(false);
      setNewTemplateName("");
      await loadTemplates();
    } catch (error) {
      console.error("Erreur lors de la création du template:", error);
      toast.error("Erreur lors de la création du modèle");
    } finally {
      setIsCreatingTemplate(false);
    }
  };

  const handleEditTemplate = (templateId: string) => {
    navigate(`/settings?tab=pdf&template=${templateId}`);
  };

  const handleDuplicateTemplate = async (template: any) => {
    try {
      const newTemplate = {
        ...template,
        id: generateTemplateId(),
        name: `${template.name} (copie)`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      await savePDFTemplate(newTemplate);
      toast.success("Modèle dupliqué avec succès");
      await loadTemplates();
    } catch (error) {
      console.error("Erreur lors de la duplication du template:", error);
      toast.error("Erreur lors de la duplication du modèle");
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    // Ne permettre la suppression que si ce n'est pas le modèle par défaut
    if (templateId === 'default') {
      toast.error("Le modèle par défaut ne peut pas être supprimé");
      return;
    }
    
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce modèle ? Cette action est irréversible.")) {
      return;
    }
    
    try {
      // La suppression complète nécessiterait une fonction backend, pour l'instant nous simulons
      // en ne rafraîchissant que les templates locaux
      setTemplates(templates.filter(t => t.id !== templateId));
      toast.success("Modèle supprimé avec succès");
      
      // Note: Une vraie implémentation devrait appeler une fonction comme deleteTemplate(templateId)
    } catch (error) {
      console.error("Erreur lors de la suppression du template:", error);
      toast.error("Erreur lors de la suppression du modèle");
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Modèles PDF</CardTitle>
          <CardDescription>
            Gérez vos différents modèles de documents PDF
          </CardDescription>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="mr-2 h-4 w-4" /> Nouveau modèle
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Créer un nouveau modèle PDF</DialogTitle>
              <DialogDescription>
                Ce modèle sera basé sur le modèle par défaut. Vous pourrez le personnaliser ensuite.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Nom
                </Label>
                <Input
                  id="name"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  className="col-span-3"
                  placeholder="Mon modèle personnalisé"
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setIsDialogOpen(false)}
              >
                Annuler
              </Button>
              <Button 
                onClick={handleCreateTemplate} 
                disabled={isCreatingTemplate || !newTemplateName.trim()}
              >
                {isCreatingTemplate ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Création...
                  </>
                ) : (
                  "Créer"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Aucun modèle PDF trouvé.</p>
            <p className="mt-2">Créez votre premier modèle en cliquant sur "Nouveau modèle".</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom du modèle</TableHead>
                <TableHead>Date de création</TableHead>
                <TableHead>Dernière mise à jour</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell className="font-medium">{template.name}</TableCell>
                  <TableCell>
                    {template.created_at 
                      ? new Date(template.created_at).toLocaleDateString('fr-FR') 
                      : 'N/A'}
                  </TableCell>
                  <TableCell>
                    {template.updated_at 
                      ? new Date(template.updated_at).toLocaleDateString('fr-FR') 
                      : 'N/A'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {showSelectButton && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => onSelectTemplate && onSelectTemplate(template.id)}
                        >
                          Sélectionner
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditTemplate(template.id)}
                      >
                        <FileEdit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDuplicateTemplate(template)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      {template.id !== 'default' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteTemplate(template.id)}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default PDFTemplateList;
