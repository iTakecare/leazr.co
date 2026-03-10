import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Send, Eye, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Contract } from "@/services/contractService";
import RichTextEditor from "@/components/ui/rich-text-editor";

interface FollowupEmailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: Contract;
}

const FollowupEmailModal: React.FC<FollowupEmailModalProps> = ({
  open,
  onOpenChange,
  contract,
}) => {
  const [to, setTo] = useState(contract.client_email || "");
  const [subject, setSubject] = useState("👋 Comment se passe votre nouvelle installation ?");
  const [htmlBody, setHtmlBody] = useState("");
  const [sending, setSending] = useState(false);
  const [companyBranding, setCompanyBranding] = useState<{
    name: string;
    logoUrl: string;
    primaryColor: string;
  }>({ name: "Notre équipe", logoUrl: "", primaryColor: "#3b82f6" });

  // Fetch company branding
  useEffect(() => {
    if (!open) return;
    const fetchBranding = async () => {
      const { data: contractData } = await supabase
        .from("contracts")
        .select("company_id")
        .eq("id", contract.id)
        .maybeSingle();

      if (contractData?.company_id) {
        const { data: company } = await supabase
          .from("companies")
          .select("name, logo_url, primary_color")
          .eq("id", contractData.company_id)
          .single();

        if (company) {
          setCompanyBranding({
            name: company.name || "Notre équipe",
            logoUrl: company.logo_url || "",
            primaryColor: company.primary_color || "#3b82f6",
          });
        }
      }
    };
    fetchBranding();
  }, [open, contract.id]);

  // Generate default HTML template
  useEffect(() => {
    if (!open) return;
    const clientName = contract.client_name || "Client";
    const { name: companyName, logoUrl, primaryColor } = companyBranding;

    const trustpilotUrl = "https://www.trustpilot.com/review/itakecare.be";
    const googleReviewUrl = "https://g.page/r/itakecare/review";

    setHtmlBody(`
<table role="presentation" style="width: 100%; border-collapse: collapse;">
  <tr>
    <td style="padding: 40px 20px;">
      <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <tr>
          <td style="background-color: ${primaryColor}; padding: 30px 40px; text-align: center;">
            ${logoUrl ? `<img src="${logoUrl}" alt="${companyName}" style="max-height: 50px; max-width: 200px;" />` : `<h1 style="margin: 0; color: #ffffff; font-size: 24px;">${companyName}</h1>`}
          </td>
        </tr>
        <tr>
          <td style="padding: 40px;">
            <h2 style="color: #1f2937; font-size: 20px; margin: 0 0 20px 0;">👋 Bonjour ${clientName},</h2>
            <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">
              Cela fait maintenant une semaine que votre matériel a été livré et nous espérons que tout se passe bien !
            </p>
            <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">
              Nous souhaitions simplement prendre de vos nouvelles et nous assurer que vous êtes pleinement satisfait(e) de votre équipement. Si vous avez la moindre question ou si quelque chose ne fonctionne pas comme prévu, n'hésitez surtout pas à nous contacter.
            </p>
            <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
              Votre avis compte beaucoup pour nous. Si vous êtes satisfait(e) de nos services, nous serions ravis que vous partagiez votre expérience :
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${trustpilotUrl}" style="display: inline-block; background-color: #00b67a; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; margin: 0 8px 12px 8px;">⭐ Avis sur Trustpilot</a>
              <br/>
              <a href="${googleReviewUrl}" style="display: inline-block; background-color: #4285f4; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; margin: 0 8px 12px 8px;">⭐ Avis sur Google</a>
            </div>
            <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 24px 0 0 0;">
              Merci pour votre confiance et à très bientôt !
            </p>
            <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 16px 0 0 0;">
              Cordialement,<br/><strong>L'équipe ${companyName}</strong>
            </p>
          </td>
        </tr>
        <tr>
          <td style="background-color: #f9fafb; padding: 20px 40px; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
              ${contract.contract_number ? `Contrat : ${contract.contract_number}<br>` : ""}
              Cet email a été envoyé par ${companyName}.<br>
              © ${new Date().getFullYear()} ${companyName}. Tous droits réservés.
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`);
  }, [open, companyBranding, contract.client_name, contract.contract_number]);

  const fullHtml = useMemo(() => {
    return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">${htmlBody}</body></html>`;
  }, [htmlBody]);

  const handleSend = async () => {
    if (!to) {
      toast.error("Veuillez renseigner l'adresse email du destinataire");
      return;
    }

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "send-manual-followup-email",
        {
          body: {
            contractId: contract.id,
            to,
            subject,
            html: fullHtml,
          },
        }
      );

      if (error) throw error;
      if (data && !data.success) throw new Error(data.error || "Erreur lors de l'envoi");

      toast.success("Email de suivi envoyé avec succès !");
      onOpenChange(false);
    } catch (err: any) {
      console.error("Erreur envoi email:", err);
      toast.error(err.message || "Erreur lors de l'envoi de l'email");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Email de suivi post-livraison</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Destinataire</Label>
              <Input
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="email@client.com"
                type="email"
              />
            </div>
            <div className="space-y-2">
              <Label>Sujet</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Sujet de l'email"
              />
            </div>
          </div>

          <Tabs defaultValue="edit" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="edit">Éditer</TabsTrigger>
              <TabsTrigger value="preview">
                <Eye className="h-4 w-4 mr-2" />
                Aperçu
              </TabsTrigger>
            </TabsList>
            <TabsContent value="edit" className="mt-4">
              <RichTextEditor
                value={htmlBody}
                onChange={setHtmlBody}
                height={400}
                placeholder="Contenu de l'email..."
              />
            </TabsContent>
            <TabsContent value="preview" className="mt-4">
              <div className="border rounded-lg overflow-hidden bg-muted/30">
                <iframe
                  srcDoc={fullHtml}
                  className="w-full"
                  style={{ height: "500px", border: "none" }}
                  title="Aperçu email"
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSend} disabled={sending}>
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Envoi en cours...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Envoyer manuellement
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FollowupEmailModal;
