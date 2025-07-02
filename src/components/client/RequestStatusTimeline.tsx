import React from "react";
import { motion } from "framer-motion";
import { Check, Clock, AlertTriangle, X, FileText, Truck, CheckCircle } from "lucide-react";

interface TimelineStep {
  id: string;
  title: string;
  description: string;
  status: "completed" | "current" | "pending" | "error";
  date?: string;
  icon: React.ComponentType<any>;
}

interface RequestStatusTimelineProps {
  currentStatus: string;
  workflowStatus?: string;
  createdAt: string;
  signedAt?: string;
}

export const RequestStatusTimeline: React.FC<RequestStatusTimelineProps> = ({
  currentStatus,
  workflowStatus,
  createdAt,
  signedAt
}) => {
  const getSteps = (): TimelineStep[] => {
    const baseSteps: TimelineStep[] = [
      {
        id: "submitted",
        title: "Demande soumise",
        description: "Votre demande a été reçue et est en cours d'examen",
        status: "completed",
        date: createdAt,
        icon: FileText
      },
      {
        id: "review",
        title: "Examen en cours",
        description: "Notre équipe analyse votre demande",
        status: currentStatus === "pending" ? "current" : currentStatus === "rejected" ? "error" : "completed",
        icon: Clock
      },
      {
        id: "decision",
        title: currentStatus === "rejected" ? "Demande refusée" : "Demande approuvée",
        description: currentStatus === "rejected" 
          ? "Votre demande n'a pas pu être acceptée"
          : "Félicitations ! Votre demande a été approuvée",
        status: currentStatus === "pending" ? "pending" : 
                currentStatus === "rejected" ? "error" : "completed",
        icon: currentStatus === "rejected" ? X : CheckCircle
      }
    ];

    if (currentStatus === "approved" || currentStatus === "sent") {
      baseSteps.push({
        id: "contract",
        title: "Contrat en préparation",
        description: "Préparation des documents contractuels",
        status: workflowStatus === "contract_sent" ? "completed" : "current",
        icon: FileText
      });
    }

    if (workflowStatus === "contract_sent") {
      baseSteps.push({
        id: "signature",
        title: "Signature du contrat",
        description: signedAt ? "Contrat signé avec succès" : "En attente de votre signature",
        status: signedAt ? "completed" : "current",
        date: signedAt,
        icon: CheckCircle
      });
    }

    return baseSteps;
  };

  const steps = getSteps();

  const getStatusColor = (status: TimelineStep["status"]) => {
    switch (status) {
      case "completed": return "hsl(var(--primary))";
      case "current": return "hsl(var(--primary))";
      case "pending": return "hsl(var(--muted-foreground))";
      case "error": return "hsl(var(--destructive))";
      default: return "hsl(var(--muted-foreground))";
    }
  };

  const getIconBgColor = (status: TimelineStep["status"]) => {
    switch (status) {
      case "completed": return "bg-primary text-primary-foreground";
      case "current": return "bg-primary text-primary-foreground animate-pulse";
      case "pending": return "bg-muted text-muted-foreground";
      case "error": return "bg-destructive text-destructive-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="relative">
      {steps.map((step, index) => {
        const IconComponent = step.icon;
        const isLast = index === steps.length - 1;
        
        return (
          <motion.div
            key={step.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="relative flex items-start pb-8"
          >
            {/* Ligne de connexion */}
            {!isLast && (
              <div 
                className="absolute left-6 top-12 w-0.5 h-full"
                style={{ backgroundColor: getStatusColor(steps[index + 1]?.status || "pending") }}
              />
            )}
            
            {/* Icône */}
            <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${getIconBgColor(step.status)}`}>
              <IconComponent className="w-5 h-5" />
            </div>
            
            {/* Contenu */}
            <div className="ml-4 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-foreground">{step.title}</h3>
                {step.date && (
                  <span className="text-xs text-muted-foreground">
                    {new Date(step.date).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{step.description}</p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};