import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMultiTenant } from "@/hooks/useMultiTenant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Eye, Ticket, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const statusLabels: Record<string, string> = {
  new: "Nouveau",
  read: "Lu",
  replied: "Répondu",
  archived: "Archivé",
};

const statusColors: Record<string, string> = {
  new: "bg-blue-100 text-blue-800",
  read: "bg-yellow-100 text-yellow-800",
  replied: "bg-green-100 text-green-800",
  archived: "bg-muted text-muted-foreground",
};

const ContactSubmissionsList = () => {
  const { companyId } = useMultiTenant();
  const queryClient = useQueryClient();
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const { data: submissions, isLoading } = useQuery({
    queryKey: ["contact-submissions", companyId, filterStatus],
    queryFn: async () => {
      let query = supabase
        .from("contact_submissions")
        .select("*")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false });

      if (filterStatus !== "all") {
        query = query.eq("status", filterStatus);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("contact_submissions")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact-submissions"] });
      toast.success("Statut mis à jour");
    },
  });

  const convertToTicket = useMutation({
    mutationFn: async (submission: any) => {
      const { error } = await supabase.from("support_tickets").insert({
        company_id: companyId!,
        contact_submission_id: submission.id,
        subject: submission.subject,
        description: `De: ${submission.name} (${submission.email})\n\n${submission.message}`,
      });
      if (error) throw error;
      await supabase
        .from("contact_submissions")
        .update({ status: "read" })
        .eq("id", submission.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
      toast.success("Ticket créé avec succès");
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Soumissions du formulaire de contact</CardTitle>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="new">Nouveau</SelectItem>
              <SelectItem value="read">Lu</SelectItem>
              <SelectItem value="replied">Répondu</SelectItem>
              <SelectItem value="archived">Archivé</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {!submissions?.length ? (
            <p className="text-center text-muted-foreground py-8">Aucune soumission</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Sujet</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.map((sub: any) => (
                  <TableRow key={sub.id}>
                    <TableCell className="text-sm">
                      {format(new Date(sub.created_at), "dd MMM yyyy HH:mm", { locale: fr })}
                    </TableCell>
                    <TableCell className="font-medium">{sub.name}</TableCell>
                    <TableCell>{sub.email}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{sub.subject}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[sub.status] || ""} variant="secondary">
                        {statusLabels[sub.status] || sub.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button size="icon" variant="ghost" onClick={() => setSelectedSubmission(sub)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => convertToTicket.mutate(sub)}
                          title="Convertir en ticket"
                        >
                          <Ticket className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedSubmission} onOpenChange={() => setSelectedSubmission(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedSubmission?.subject}</DialogTitle>
          </DialogHeader>
          {selectedSubmission && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Nom :</span>
                  <p className="font-medium">{selectedSubmission.name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Email :</span>
                  <p className="font-medium">{selectedSubmission.email}</p>
                </div>
                {selectedSubmission.phone && (
                  <div>
                    <span className="text-muted-foreground">Téléphone :</span>
                    <p className="font-medium">{selectedSubmission.phone}</p>
                  </div>
                )}
                {selectedSubmission.company_name && (
                  <div>
                    <span className="text-muted-foreground">Entreprise :</span>
                    <p className="font-medium">{selectedSubmission.company_name}</p>
                  </div>
                )}
              </div>
              <div>
                <span className="text-muted-foreground text-sm">Message :</span>
                <p className="mt-1 whitespace-pre-wrap text-sm">{selectedSubmission.message}</p>
              </div>
              <div className="flex gap-2">
                <Select
                  value={selectedSubmission.status}
                  onValueChange={(val) => {
                    updateStatus.mutate({ id: selectedSubmission.id, status: val });
                    setSelectedSubmission({ ...selectedSubmission, status: val });
                  }}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">Nouveau</SelectItem>
                    <SelectItem value="read">Lu</SelectItem>
                    <SelectItem value="replied">Répondu</SelectItem>
                    <SelectItem value="archived">Archivé</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={() => {
                    convertToTicket.mutate(selectedSubmission);
                    setSelectedSubmission(null);
                  }}
                >
                  <Ticket className="h-4 w-4 mr-2" />
                  Créer un ticket
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ContactSubmissionsList;
