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
import { differenceInDays } from "date-fns";

interface FollowupEmailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: Contract;
}

function getDeliveryDurationText(deliveryDate: string | null | undefined): string {
  if (!deliveryDate) return "quelques temps";
  const days = differenceInDays(new Date(), new Date(deliveryDate));
  const weeks = Math.floor(days / 7);
  if (weeks <= 1) return "une semaine";
  if (weeks === 2) return "2 semaines";
  if (weeks === 3) return "3 semaines";
  if (weeks === 4) return "un mois";
  return "quelques semaines";
}

const FollowupEmailModal: React.FC<FollowupEmailModalProps> = ({
  open,
  onOpenChange,
  contract,
}) => {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("👋 Comment se passe votre nouvelle installation ?");
  const [htmlBody, setHtmlBody] = useState("");
  const [sending, setSending] = useState(false);
  const [companyBranding, setCompanyBranding] = useState<{
    name: string;
    logoUrl: string;
    primaryColor: string;
  }>({ name: "Notre équipe", logoUrl: "", primaryColor: "#2563eb" });

  // Editable URLs
  const [trustpilotUrl, setTrustpilotUrl] = useState("https://www.trustpilot.com/review/itakecare.be");
  const [googleReviewUrl, setGoogleReviewUrl] = useState("https://g.page/r/itakecare/review");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");

  // Sync email when modal opens or contract changes
  useEffect(() => {
    if (!open) return;
    const email = contract.client_email || (contract as any).clients?.email || "";
    setTo(email);
  }, [open, contract]);

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
            primaryColor: company.primary_color || "#2563eb",
          });
        }
      }
    };
    fetchBranding();
  }, [open, contract.id]);

  // Generate HTML template
  useEffect(() => {
    if (!open) return;
    const clientName = contract.client_name || "Client";
    const { name: companyName, logoUrl, primaryColor } = companyBranding;
    const durationText = getDeliveryDurationText((contract as any).delivery_date);

    const socialLinksHtml = [facebookUrl, linkedinUrl, instagramUrl].some(u => u)
      ? `<tr>
          <td style="padding: 24px 40px 8px 40px;">
            <p style="margin: 0 0 16px 0; color: #6b7280; font-size: 14px; text-align: center; font-weight: 600;">Suivez-nous sur les réseaux sociaux</p>
            <div style="text-align: center;">
              ${facebookUrl ? `<a href="${facebookUrl}" style="display: inline-block; margin: 0 8px; text-decoration: none;"><img src="https://cdn-icons-png.flaticon.com/512/733/733547.png" alt="Facebook" width="32" height="32" style="border-radius: 6px;" /></a>` : ""}
              ${linkedinUrl ? `<a href="${linkedinUrl}" style="display: inline-block; margin: 0 8px; text-decoration: none;"><img src="https://cdn-icons-png.flaticon.com/512/733/733561.png" alt="LinkedIn" width="32" height="32" style="border-radius: 6px;" /></a>` : ""}
              ${instagramUrl ? `<a href="${instagramUrl}" style="display: inline-block; margin: 0 8px; text-decoration: none;"><img src="https://cdn-icons-png.flaticon.com/512/733/733558.png" alt="Instagram" width="32" height="32" style="border-radius: 6px;" /></a>` : ""}
            </div>
          </td>
        </tr>`
      : "";

    setHtmlBody(`
<table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f3f4f6;">
  <tr>
    <td style="padding: 40px 16px;">
      <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 30px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background: linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd); padding: 32px 40px; text-align: center;">
            ${logoUrl ? `<img src="${logoUrl}" alt="${companyName}" style="max-height: 48px; max-width: 180px; margin-bottom: 8px;" />` : `<h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 700; letter-spacing: -0.3px;">${companyName}</h1>`}
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding: 40px;">
            <h2 style="color: #111827; font-size: 20px; margin: 0 0 24px 0; font-weight: 700;">👋 Bonjour ${clientName},</h2>
            <p style="color: #374151; font-size: 15px; line-height: 1.7; margin: 0 0 16px 0;">
              Cela fait maintenant <strong>${durationText}</strong> que votre matériel a été livré et nous espérons que tout se passe bien !
            </p>
            <p style="color: #374151; font-size: 15px; line-height: 1.7; margin: 0 0 16px 0;">
              Nous souhaitions simplement prendre de vos nouvelles et nous assurer que vous êtes pleinement satisfait(e) de votre équipement. Si vous avez la moindre question ou si quelque chose ne fonctionne pas comme prévu, n'hésitez surtout pas à nous contacter.
            </p>
            <p style="color: #374151; font-size: 15px; line-height: 1.7; margin: 0 0 28px 0;">
              Votre avis compte beaucoup pour nous ! Si vous êtes satisfait(e), nous serions ravis que vous partagiez votre expérience :
            </p>
            <!-- CTA Buttons -->
            <div style="text-align: center; margin: 0 0 32px 0;">
              ${trustpilotUrl ? `<a href="${trustpilotUrl}" style="display: inline-block; background-color: #00b67a; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 700; font-size: 14px; margin: 0 6px 12px 6px; letter-spacing: 0.2px;">⭐ Avis sur Trustpilot</a>` : ""}
              ${googleReviewUrl ? `<br/><a href="${googleReviewUrl}" style="display: inline-block; background-color: #4285f4; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 700; font-size: 14px; margin: 0 6px 12px 6px; letter-spacing: 0.2px;">⭐ Avis sur Google</a>` : ""}
            </div>
            <p style="color: #374151; font-size: 15px; line-height: 1.7; margin: 0 0 4px 0;">
              Merci pour votre confiance et à très bientôt !
            </p>
            <p style="color: #374151; font-size: 15px; line-height: 1.7; margin: 16px 0 0 0;">
              Cordialement,<br/><strong>L'équipe ${companyName}</strong>
            </p>
          </td>
        </tr>
        <!-- Social Links -->
        ${socialLinksHtml}
        <!-- Footer -->
        <tr>
          <td style="background-color: #f9fafb; padding: 24px 40px; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center; line-height: 1.6;">
              ${contract.contract_number ? `Contrat : ${contract.contract_number}<br/>` : ""}
              Cet email a été envoyé par ${companyName}.<br/>
              © ${new Date().getFullYear()} ${companyName}. Tous droits réservés.
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`);
  }, [open, companyBranding, contract.client_name, contract.contract_number, (contract as any).delivery_date, trustpilotUrl, googleReviewUrl, facebookUrl, linkedinUrl, instagramUrl]);

  const fullHtml = useMemo(() => {
    return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">${htmlBody}</body></html>`;
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
          {/* To / Subject */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Destinataire</Label>
              <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="email@client.com" type="email" />
            </div>
            <div className="space-y-2">
              <Label>Sujet</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Sujet de l'email" />
            </div>
          </div>

          {/* Editor / Preview */}
          <Tabs defaultValue="edit" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="edit">Éditer</TabsTrigger>
              <TabsTrigger value="preview">
                <Eye className="h-4 w-4 mr-2" />
                Aperçu
              </TabsTrigger>
            </TabsList>
            <TabsContent value="edit" className="mt-4">
              <RichTextEditor value={htmlBody} onChange={setHtmlBody} height={400} placeholder="Contenu de l'email..." />
            </TabsContent>
            <TabsContent value="preview" className="mt-4">
              <div className="border rounded-lg overflow-hidden bg-muted/30">
                <iframe srcDoc={fullHtml} className="w-full" style={{ height: "500px", border: "none" }} title="Aperçu email" />
              </div>
            </TabsContent>
          </Tabs>

          {/* Editable URLs */}
          <div className="border rounded-lg p-4 space-y-3 bg-muted/20">
            <p className="text-sm font-semibold text-muted-foreground">Liens dans l'email</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Trustpilot</Label>
                <Input value={trustpilotUrl} onChange={(e) => setTrustpilotUrl(e.target.value)} placeholder="https://trustpilot.com/..." />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Google Review</Label>
                <Input value={googleReviewUrl} onChange={(e) => setGoogleReviewUrl(e.target.value)} placeholder="https://g.page/..." />
              </div>
            </div>
            <p className="text-sm font-semibold text-muted-foreground pt-2">Réseaux sociaux</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Facebook</Label>
                <Input value={facebookUrl} onChange={(e) => setFacebookUrl(e.target.value)} placeholder="https://facebook.com/..." />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">LinkedIn</Label>
                <Input value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} placeholder="https://linkedin.com/..." />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Instagram</Label>
                <Input value={instagramUrl} onChange={(e) => setInstagramUrl(e.target.value)} placeholder="https://instagram.com/..." />
              </div>
            </div>
          </div>
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
