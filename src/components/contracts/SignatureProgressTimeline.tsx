import React from "react";
import { motion } from "framer-motion";
import { 
  FileText, 
  Send, 
  CreditCard, 
  PenTool, 
  FileCheck, 
  Mail,
  Check,
  Clock,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";

interface SignatureProgressTimelineProps {
  contractStatus: string;
  signatureStatus?: string;
  hasIBAN: boolean;
  hasPDF: boolean;
  contractCreatedAt: string;
  signedAt?: string;
}

interface TimelineStep {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  status: "completed" | "current" | "pending" | "error";
  date?: string;
}

const SignatureProgressTimeline: React.FC<SignatureProgressTimelineProps> = ({
  contractStatus,
  signatureStatus,
  hasIBAN,
  hasPDF,
  contractCreatedAt,
  signedAt
}) => {
  // Déterminer le statut de chaque étape
  const isContractSent = contractStatus !== 'draft';
  const isSepaValid = hasIBAN;
  const isSigned = signatureStatus === 'signed';
  const isPdfGenerated = hasPDF;
  const isEmailSent = isSigned && hasPDF; // Assumé si signé et PDF généré

  const getStepStatus = (completed: boolean, isCurrent: boolean): "completed" | "current" | "pending" => {
    if (completed) return "completed";
    if (isCurrent) return "current";
    return "pending";
  };

  // Déterminer l'étape courante
  const getCurrentStep = () => {
    if (!isContractSent) return "contract_sent";
    if (!isSepaValid) return "sepa_valid";
    if (!isSigned) return "signed";
    if (!isPdfGenerated) return "pdf_generated";
    if (!isEmailSent) return "email_sent";
    return null;
  };

  const currentStep = getCurrentStep();

  const steps: TimelineStep[] = [
    {
      id: "contract_created",
      title: "Contrat créé",
      description: "Le contrat a été généré",
      icon: FileText,
      status: "completed",
      date: contractCreatedAt
    },
    {
      id: "contract_sent",
      title: "Contrat envoyé",
      description: "Envoyé au client pour signature",
      icon: Send,
      status: getStepStatus(isContractSent, currentStep === "contract_sent")
    },
    {
      id: "sepa_valid",
      title: "SEPA validé",
      description: "IBAN du client renseigné",
      icon: CreditCard,
      status: getStepStatus(isSepaValid, currentStep === "sepa_valid")
    },
    {
      id: "signed",
      title: "Contrat signé",
      description: "Signature du client reçue",
      icon: PenTool,
      status: getStepStatus(isSigned, currentStep === "signed"),
      date: signedAt
    },
    {
      id: "pdf_generated",
      title: "PDF généré",
      description: "Document signé créé",
      icon: FileCheck,
      status: getStepStatus(isPdfGenerated, currentStep === "pdf_generated")
    },
    {
      id: "email_sent",
      title: "Email envoyé",
      description: "Confirmation envoyée",
      icon: Mail,
      status: getStepStatus(isEmailSent, currentStep === "email_sent")
    }
  ];

  const getStatusStyles = (status: TimelineStep["status"]) => {
    switch (status) {
      case "completed":
        return {
          iconBg: "bg-primary",
          iconColor: "text-primary-foreground",
          lineColor: "bg-primary",
          textColor: "text-foreground"
        };
      case "current":
        return {
          iconBg: "bg-amber-500",
          iconColor: "text-white",
          lineColor: "bg-border",
          textColor: "text-foreground"
        };
      case "pending":
        return {
          iconBg: "bg-muted",
          iconColor: "text-muted-foreground",
          lineColor: "bg-border",
          textColor: "text-muted-foreground"
        };
      case "error":
        return {
          iconBg: "bg-destructive",
          iconColor: "text-destructive-foreground",
          lineColor: "bg-destructive",
          textColor: "text-destructive"
        };
    }
  };

  const getStatusIcon = (status: TimelineStep["status"], StepIcon: React.ElementType) => {
    switch (status) {
      case "completed":
        return Check;
      case "current":
        return Clock;
      case "error":
        return AlertCircle;
      default:
        return StepIcon;
    }
  };

  return (
    <div className="space-y-1">
      {steps.map((step, index) => {
        const styles = getStatusStyles(step.status);
        const StatusIcon = getStatusIcon(step.status, step.icon);
        const isLast = index === steps.length - 1;

        return (
          <motion.div
            key={step.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1, duration: 0.3 }}
            className="relative"
          >
            <div className="flex gap-3">
              {/* Icon */}
              <div className="flex flex-col items-center">
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: index * 0.1 + 0.2, duration: 0.2 }}
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                    styles.iconBg
                  )}
                >
                  <StatusIcon className={cn("h-4 w-4", styles.iconColor)} />
                </motion.div>
                
                {/* Ligne de connexion */}
                {!isLast && (
                  <div className={cn("w-0.5 h-8 mt-1", styles.lineColor)} />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pb-4">
                <div className="flex items-center gap-2">
                  <span className={cn("font-medium text-sm", styles.textColor)}>
                    {step.title}
                  </span>
                  {step.status === "current" && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded-full"
                    >
                      En cours
                    </motion.span>
                  )}
                </div>
                <p className={cn("text-xs mt-0.5", styles.textColor, "opacity-70")}>
                  {step.description}
                </p>
                {step.date && step.status === "completed" && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDate(step.date)}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

export default SignatureProgressTimeline;
