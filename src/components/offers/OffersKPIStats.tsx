import React, { useMemo } from "react";
import { FileText, FilePen, FileSearch, Send, Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface OffersKPIStatsProps {
  offers: any[];
  activeKPIFilter: string | null;
  onKPIClick: (filter: string) => void;
}

// Mêmes statuts que le dashboard pour "En Attente"
const PENDING_STATUSES = [
  'draft', 'sent', 'offer_send', 'info_requested', 'info_received',
  'internal_docs_requested', 'internal_approved', 'leaser_review',
  'leaser_introduced', 'approved', 'pending'
];

const OffersKPIStats = ({ offers, activeKPIFilter, onKPIClick }: OffersKPIStatsProps) => {
  const stats = useMemo(() => {
    // Total = mêmes statuts que la carte "En Attente" du dashboard
    const total = offers.filter(o => 
      PENDING_STATUSES.includes(o.workflow_status || '')
    ).length;
    
    const drafts = offers.filter(o => o.workflow_status === 'draft').length;
    const docsRequested = offers.filter(o => o.workflow_status === 'internal_docs_requested').length;
    const sent = offers.filter(o => ['sent', 'offer_send'].includes(o.workflow_status || '')).length;
    const leaserIntroduced = offers.filter(o => o.workflow_status === 'leaser_introduced').length;
    
    return { total, drafts, docsRequested, sent, leaserIntroduced };
  }, [offers]);

  const kpis = [
    { filterKey: 'total', icon: FileText, label: "Total", value: stats.total, bgColor: "bg-indigo-50", borderColor: "border-indigo-200", textColor: "text-indigo-600" },
    { filterKey: 'drafts', icon: FilePen, label: "Brouillons", value: stats.drafts, bgColor: "bg-gray-50", borderColor: "border-gray-200", textColor: "text-gray-600" },
    { filterKey: 'docsRequested', icon: FileSearch, label: "Docs demandés", value: stats.docsRequested, bgColor: "bg-orange-50", borderColor: "border-orange-200", textColor: "text-orange-600" },
    { filterKey: 'sent', icon: Send, label: "Offres envoyées", value: stats.sent, bgColor: "bg-blue-50", borderColor: "border-blue-200", textColor: "text-blue-600" },
    { filterKey: 'leaserIntroduced', icon: Building2, label: "Introduit Leaser", value: stats.leaserIntroduced, bgColor: "bg-purple-50", borderColor: "border-purple-200", textColor: "text-purple-600" },
  ];

  const isActive = (filterKey: string) => {
    if (filterKey === 'total') {
      return !activeKPIFilter || activeKPIFilter === 'total';
    }
    return activeKPIFilter === filterKey;
  };

  const handleClick = (filterKey: string) => {
    if (filterKey === 'total') {
      onKPIClick('total');
    } else {
      onKPIClick(activeKPIFilter === filterKey ? 'total' : filterKey);
    }
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        const active = isActive(kpi.filterKey);
        
        return (
          <Card 
            key={kpi.filterKey} 
            className={`${kpi.bgColor} ${kpi.borderColor} border cursor-pointer transition-all hover:shadow-md
              ${active ? 'ring-2 ring-offset-2 ring-primary shadow-md' : 'opacity-80 hover:opacity-100'}`}
            onClick={() => handleClick(kpi.filterKey)}
          >
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
