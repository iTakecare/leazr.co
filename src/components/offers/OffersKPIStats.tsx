import React, { useMemo } from "react";
import { FileText, FilePen, FileSearch, Send } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface OffersKPIStatsProps {
  offers: any[];
}

// Mêmes statuts que le dashboard pour "En Attente"
const PENDING_STATUSES = [
  'draft', 'sent', 'offer_send', 'info_requested', 'info_received',
  'internal_docs_requested', 'internal_approved', 'leaser_review',
  'leaser_introduced', 'approved', 'pending'
];

const OffersKPIStats = ({ offers }: OffersKPIStatsProps) => {
  const stats = useMemo(() => {
    // Total = mêmes statuts que la carte "En Attente" du dashboard
    const total = offers.filter(o => 
      PENDING_STATUSES.includes(o.workflow_status || '')
    ).length;
    
    const drafts = offers.filter(o => o.workflow_status === 'draft').length;
    const docsRequested = offers.filter(o => o.workflow_status === 'internal_docs_requested').length;
    const sent = offers.filter(o => ['sent', 'offer_send'].includes(o.workflow_status || '')).length;
    
    return { total, drafts, docsRequested, sent };
  }, [offers]);

  const kpis = [
    { icon: FileText, label: "Total", value: stats.total, bgColor: "bg-indigo-50", borderColor: "border-indigo-200", textColor: "text-indigo-600" },
    { icon: FilePen, label: "Brouillons", value: stats.drafts, bgColor: "bg-gray-50", borderColor: "border-gray-200", textColor: "text-gray-600" },
    { icon: FileSearch, label: "Docs demandés", value: stats.docsRequested, bgColor: "bg-orange-50", borderColor: "border-orange-200", textColor: "text-orange-600" },
    { icon: Send, label: "Offres envoyées", value: stats.sent, bgColor: "bg-blue-50", borderColor: "border-blue-200", textColor: "text-blue-600" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        
        return (
          <Card key={kpi.label} className={`${kpi.bgColor} ${kpi.borderColor} border`}>
            <CardContent className="p-3 flex items-center gap-3">
              <div className={`p-2 rounded-full bg-white/50 ${kpi.textColor}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <p className={`text-2xl font-bold ${kpi.textColor}`}>{kpi.value}</p>
                <p className={`text-xs ${kpi.textColor} opacity-75`}>{kpi.label}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default OffersKPIStats;
