import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Mail, X } from "lucide-react";
import { toast } from "sonner";
import DOMPurify from "dompurify";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

interface RejectionEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  offerId: string;
  offerData: any;
  onSendEmailAndValidate: (customTitle?: string, customContent?: string) => Promise<void>;
  onValidateWithoutEmail: () => Promise<void>;
}

const RejectionEmailModal: React.FC<RejectionEmailModalProps> = ({
  isOpen,
  onClose,
  offerId,
  offerData,
  onSendEmailAndValidate,
  onValidateWithoutEmail,
}) => {
  const [isSending, setIsSending] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [emailTitle, setEmailTitle] = useState("");
  const [emailContent, setEmailContent] = useState("");
  const [emailPreview, setEmailPreview] = useState("");

  const defaultTitle = "😕 Nous sommes désolés, votre demande de leasing n'a pas été acceptée";
  const defaultBody = `Bonjour,

Nous sommes désolés de vous apprendre que notre partenaire financier nous a indiqué qu'il ne pouvait pas donner suite à votre demande de leasing.

Nous ne pourrons donc pas vous proposer de matériel cette fois-ci.
Je vous souhaite tout le meilleur pour la suite de vos activités.
À bientôt,

L'équipe iTakecare`;

  useEffect(() => {
    if (isOpen) {
      setEmailTitle(defaultTitle);
      setEmailContent(defaultBody);
      generateEmailPreview(defaultTitle, defaultBody);
    }
  }, [isOpen]);

  const generateEmailPreview = (title: string, body: string) => {
    const formattedBody = body.replace(/\n/g, '<br>');
    const preview = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
            color: white;
            padding: 30px;
            border-radius: 10px 10px 0 0;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
          }
          .content {
            background: #ffffff;
            padding: 30px;
            border: 1px solid #e5e7eb;
            border-top: none;
            white-space: pre-wrap;
          }
          .footer {
            text-align: center;
            color: #6b7280;
            font-size: 14px;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${title}</h1>
        </div>
        
        <div class="content">
          ${formattedBody}
        </div>
        
        <div class="footer">
          <p>iTakecare SRL | BE0795.642.894<br>
          Avenue Général Michel 1E - 6000 Charleroi<br>
          <a href="https://www.itakecare.be">www.itakecare.be</a> | <a href="mailto:hello@itakecare.be">hello@itakecare.be</a></p>
        </div>
      </body>
      </html>
    `;
    setEmailPreview(preview);
  };

  const handleTitleChange = (value: string) => {
    setEmailTitle(value);
    generateEmailPreview(value, emailContent);
  };

  const handleContentChange = (value: string) => {
    setEmailContent(value);
    generateEmailPreview(emailTitle, value);
  };

  const handleSendAndValidate = async () => {
    try {
      setIsSending(true);
      const customTitle = emailTitle !== defaultTitle ? emailTitle : undefined;
      const customContent = emailContent !== defaultBody ? emailContent : undefined;
      await onSendEmailAndValidate(customTitle, customContent);
      toast.success("Email de refus envoyé avec succès");
      onClose();
    } catch (error) {
      console.error("Erreur lors de l'envoi:", error);
      toast.error("Erreur lors de l'envoi de l'email");
    } finally {
      setIsSending(false);
    }
  };

  const handleValidateWithoutEmail = async () => {
    try {
      setIsSending(true);
      await onValidateWithoutEmail();
      toast.success("Score C validé sans envoi d'email");
      onClose();
    } catch (error) {
      console.error("Erreur lors de la validation:", error);
      toast.error("Erreur lors de la validation");
    } finally {
      setIsSending(false);
    }
  };

  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['link'],
      ['clean']
    ],
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            Confirmation de refus - Envoi d'email
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Destinataire */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Destinataire
            </Label>
            <div className="text-sm bg-muted p-3 rounded-md">
              <strong>{offerData?.client_name}</strong> ({offerData?.client_email})
            </div>
          </div>

          {/* Mode édition / prévisualisation */}
          <div className="flex items-center justify-between">
            <Label>Contenu de l'email</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditMode(!isEditMode)}
            >
              {isEditMode ? "Prévisualiser" : "Éditer"}
            </Button>
          </div>

          {isEditMode ? (
            <div className="space-y-4">
              {/* Titre */}
              <div className="space-y-2">
                <Label htmlFor="email-title">Titre de l'email</Label>
                <Input
                  id="email-title"
                  value={emailTitle}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Titre de l'email"
                />
              </div>

              {/* Corps avec éditeur HTML */}
              <div className="space-y-2">
                <Label htmlFor="email-content">Corps du message</Label>
                <ReactQuill
                  theme="snow"
                  value={emailContent}
                  onChange={handleContentChange}
                  modules={quillModules}
                  className="bg-white"
                />
              </div>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <div
                className="p-4 bg-white"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(emailPreview) }}
              />
            </div>
          )}

          {/* Informations */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-medium mb-1">À propos de cet email</p>
                <p>
                  Cet email sera envoyé au client pour l'informer du refus de sa demande de leasing.
                  Vous pouvez personnaliser le titre et le contenu avant l'envoi.
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSending}>
            <X className="mr-2 h-4 w-4" />
            Annuler
          </Button>
          <Button
            variant="secondary"
            onClick={handleValidateWithoutEmail}
            disabled={isSending}
          >
            Valider sans envoyer
          </Button>
          <Button onClick={handleSendAndValidate} disabled={isSending}>
            <Mail className="mr-2 h-4 w-4" />
            {isSending ? "Envoi en cours..." : "Envoyer et valider"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RejectionEmailModal;
