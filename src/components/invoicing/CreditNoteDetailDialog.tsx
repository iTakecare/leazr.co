import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CreditNote, updateCreditNote, deleteCreditNote } from "@/services/creditNoteService";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { FileText, Calendar as CalendarIcon, MessageSquare, ExternalLink, Pencil, Trash2, Save, X, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CreditNoteDetailDialogProps {
  creditNote: CreditNote | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefresh?: () => void;
}

export const CreditNoteDetailDialog = ({ creditNote, open, onOpenChange, onRefresh }: CreditNoteDetailDialogProps) => {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Champs éditables
  const [editNumber, setEditNumber] = useState("");
  const [editDate, setEditDate] = useState<Date | undefined>(undefined);
  const [editReason, setEditReason] = useState("");

  if (!creditNote) return null;

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'applied':
        return <Badge className="bg-green-100 text-green-800">Appliquée</Badge>;
      case 'draft':
        return <Badge variant="outline">Brouillon</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleViewInvoice = () => {
    onOpenChange(false);
    navigate(`/admin/invoicing/${creditNote.invoice_id}`);
  };

  const handleStartEdit = () => {
    setEditNumber(creditNote.credit_note_number || "");
    setEditDate(creditNote.issued_at ? new Date(creditNote.issued_at) : undefined);
    setEditReason(creditNote.reason || "");
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await updateCreditNote(creditNote.id, {
        credit_note_number: editNumber || undefined,
        issued_at: editDate ? editDate.toISOString() : undefined,
        reason: editReason || undefined
      });
      toast.success("Note de crédit mise à jour");
      setIsEditing(false);
      onRefresh?.();
    } catch (error) {
      console.error("Erreur lors de la mise à jour:", error);
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      const success = await deleteCreditNote(creditNote.id);
      if (success) {
        toast.success("Note de crédit supprimée");
        onOpenChange(false);
        onRefresh?.();
      } else {
        toast.error("Erreur lors de la suppression");
      }
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      toast.error("Erreur lors de la suppression");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Note de crédit {creditNote.credit_note_number || creditNote.id.slice(0, 8)}
            </DialogTitle>
            <DialogDescription>
              {isEditing ? "Modifier la note de crédit" : "Détails de la note de crédit"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Statut et montant */}
            <div className="flex items-center justify-between">
              {getStatusBadge(creditNote.status)}
              <span className="text-2xl font-bold text-red-600">
                -{formatAmount(creditNote.amount)}
              </span>
            </div>

            <Separator />

            {/* Numéro de note de crédit */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-muted-foreground">Numéro</label>
              {isEditing ? (
                <Input
                  value={editNumber}
                  onChange={(e) => setEditNumber(e.target.value)}
                  placeholder="Numéro de note de crédit"
                />
              ) : (
                <p className="font-medium">
                  {creditNote.credit_note_number || '-'}
                </p>
              )}
            </div>

            {/* Facture liée */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-muted-foreground">Facture liée</label>
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {creditNote.invoice?.invoice_number || creditNote.invoice_id.substring(0, 8)}
                </span>
                <Button variant="ghost" size="sm" onClick={handleViewInvoice}>
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
              {creditNote.invoice?.leaser_name && (
                <p className="text-sm text-muted-foreground">
                  Bailleur: {creditNote.invoice.leaser_name}
                </p>
              )}
            </div>

            <Separator />

            {/* Date d'émission */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <CalendarIcon className="h-4 w-4" />
                Date d'émission
              </label>
              {isEditing ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !editDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {editDate ? format(editDate, "dd MMMM yyyy", { locale: fr }) : "Sélectionner une date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={editDate}
                      onSelect={setEditDate}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              ) : (
                <p className="font-medium">
                  {creditNote.issued_at 
                    ? format(new Date(creditNote.issued_at), 'dd MMMM yyyy', { locale: fr })
                    : '-'}
                </p>
              )}
            </div>

            <Separator />

            {/* Raison */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <MessageSquare className="h-4 w-4" />
                Raison
              </label>
              {isEditing ? (
                <Textarea
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="Raison de la note de crédit"
                  rows={3}
                />
              ) : (
                <div className="p-3 bg-muted/50 rounded-md">
                  <p className="text-sm whitespace-pre-wrap">
                    {creditNote.reason || "Aucune raison spécifiée"}
                  </p>
                </div>
              )}
            </div>

            {/* Dates de création */}
            {!isEditing && (
              <>
                <Separator />
                <div className="space-y-1">
                  <label className="text-sm font-medium text-muted-foreground">Créée le</label>
                  <p className="font-medium">
                    {format(new Date(creditNote.created_at), 'dd MMMM yyyy', { locale: fr })}
                  </p>
                </div>
              </>
            )}

            {/* Montant original de la facture */}
            {!isEditing && creditNote.invoice?.amount && (
              <>
                <Separator />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Montant original de la facture</span>
                  <span className="font-medium">{formatAmount(creditNote.invoice.amount)}</span>
                </div>
              </>
            )}
          </div>

          <div className="flex justify-between mt-4">
            {isEditing ? (
              <>
                <Button 
                  variant="destructive" 
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isSaving}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleCancelEdit} disabled={isSaving}>
                    <X className="h-4 w-4 mr-2" />
                    Annuler
                  </Button>
                  <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Enregistrer
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={handleStartEdit}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Modifier
                </Button>
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Fermer
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la note de crédit ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La facture liée sera remise à son état "en attente" et le montant crédité sera annulé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};