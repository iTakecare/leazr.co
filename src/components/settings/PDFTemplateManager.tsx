
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash, Eye, Copy } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getPDFTemplates, deletePDFTemplate } from "@/services/pdfTemplateService";
import PDFTemplateEditor from "./PDFTemplateEditor";
import PDFTemplatePreview from "./PDFTemplatePreview";
import PDFTemplateCard from "./PDFTemplateCard";

const PDFTemplateManager = () => {
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [editMode, setEditMode] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const queryClient = useQueryClient();

  // Fetch templates
  const { data: templates = [], isLoading, error } = useQuery({
    queryKey: ['pdfTemplates'],
    queryFn: getPDFTemplates
  });

  // Delete template mutation
  const deleteMutation = useMutation({
    mutationFn: deletePDFTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pdfTemplates'] });
      toast.success("Le modèle a été supprimé avec succès");
    },
    onError: (error) => {
      toast.error("Erreur lors de la suppression du modèle");
      console.error("Delete error:", error);
    }
  });

  const handleDelete = (id: string) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce modèle ?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleEdit = (template: any) => {
    setSelectedTemplate(template);
    setEditMode(true);
  };

  const handlePreview = (template: any) => {
    setSelectedTemplate(template);
    setPreviewMode(true);
  };

  const handleDuplicate = (template: any) => {
    // Créer une copie du template avec un nouveau nom
    const duplicatedTemplate = {
      ...template,
      id: undefined,
      name: `${template.name} (copie)`
    };
    setSelectedTemplate(duplicatedTemplate);
    setEditMode(true);
  };

  const handleCreateNew = () => {
    // Initialiser un nouveau template vide
    setSelectedTemplate({
      name: "Nouveau modèle",
      companyName: "",
      companyAddress: "",
      companySiret: "",
      companyContact: "",
      headerText: "",
      footerText: "",
      primaryColor: "#3B82F6",
      secondaryColor: "#1E3A8A",
      logoURL: "",
      templateImages: [],
      fields: {}
    });
    setEditMode(true);
  };

  const closeModals = () => {
    setEditMode(false);
    setPreviewMode(false);
    setSelectedTemplate(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">Gestion des modèles PDF</h3>
        <Button onClick={handleCreateNew}>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau modèle
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Chargement des modèles...</div>
      ) : error ? (
        <div className="text-center py-8 text-destructive">
          Une erreur est survenue lors du chargement des modèles
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12 border rounded-md">
          <h4 className="text-lg font-medium mb-2">Aucun modèle PDF</h4>
          <p className="text-muted-foreground mb-4">
            Commencez par créer votre premier modèle PDF pour vos documents.
          </p>
          <Button onClick={handleCreateNew}>
            <Plus className="mr-2 h-4 w-4" />
            Créer un modèle
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template: any) => (
            <PDFTemplateCard
              key={template.id}
              template={template}
              onEdit={() => handleEdit(template)}
              onDelete={() => handleDelete(template.id)}
              onPreview={() => handlePreview(template)}
              onDuplicate={() => handleDuplicate(template)}
            />
          ))}
        </div>
      )}

      {/* Modal d'édition */}
      <Dialog open={editMode} onOpenChange={setEditMode}>
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>
              {selectedTemplate?.id ? `Modifier ${selectedTemplate.name}` : "Créer un nouveau modèle"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            {selectedTemplate && (
              <PDFTemplateEditor 
                template={selectedTemplate} 
                onClose={closeModals} 
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de prévisualisation */}
      <Dialog open={previewMode} onOpenChange={setPreviewMode}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>Aperçu: {selectedTemplate?.name}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 h-[70vh]">
            {selectedTemplate && <PDFTemplatePreview template={selectedTemplate} />}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PDFTemplateManager;
