import React from 'react';
import { motion } from 'framer-motion';
import { FileWarning, ArrowRight, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DocumentAlert {
  id: string;
  offerId?: string;
  dossierNumber?: string;
  documentsList?: string[];
  documentCount?: number;
  description: string;
  actionHref?: string;
}

interface DocumentAlertBannerProps {
  alerts: DocumentAlert[];
  onNavigate: (href: string) => void;
}

const DocumentAlertBanner: React.FC<DocumentAlertBannerProps> = ({ alerts, onNavigate }) => {
  if (alerts.length === 0) return null;

  return (
    <div className="space-y-3">
      {alerts.map((alert, index) => (
        <motion.div
          key={alert.id}
          initial={{ opacity: 0, y: -12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4, delay: index * 0.1 }}
          className="relative overflow-hidden rounded-2xl border border-amber-200 dark:border-amber-800/50 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 dark:from-amber-950/40 dark:via-orange-950/30 dark:to-amber-950/40 shadow-sm"
        >
          {/* Left accent bar */}
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-amber-400 to-orange-500" />

          <div className="flex items-start gap-4 p-5 pl-6">
            {/* Animated icon */}
            <div className="shrink-0 mt-0.5">
              <motion.div
                animate={{ y: [0, -3, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md shadow-amber-500/20"
              >
                <FileWarning className="h-5 w-5 text-white" />
              </motion.div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                  Action requise — Documents à fournir
                </h3>
                {(alert.documentCount ?? 0) > 0 && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200">
                    {alert.documentCount} doc{(alert.documentCount ?? 0) > 1 ? 's' : ''}
                  </span>
                )}
              </div>

              <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mb-2">
                {alert.dossierNumber
                  ? `${alert.documentCount ?? 0} document${(alert.documentCount ?? 0) > 1 ? 's' : ''} demandé${(alert.documentCount ?? 0) > 1 ? 's' : ''} pour votre demande ${alert.dossierNumber}`
                  : `${alert.documentCount ?? 0} document${(alert.documentCount ?? 0) > 1 ? 's' : ''} requis pour poursuivre votre demande`
                }
              </p>

              {/* Documents list */}
              {alert.documentsList && alert.documentsList.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {alert.documentsList.slice(0, 4).map((doc, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-lg bg-white/70 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border border-amber-200/60 dark:border-amber-700/40"
                    >
                      <FileText className="h-3 w-3" />
                      {doc}
                    </span>
                  ))}
                  {alert.documentsList.length > 4 && (
                    <span className="text-[11px] text-amber-700 dark:text-amber-400 font-medium px-2 py-1">
                      +{alert.documentsList.length - 4} autre{alert.documentsList.length - 4 > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* CTA */}
            <div className="shrink-0 self-center">
              <Button
                size="sm"
                onClick={() => alert.actionHref && onNavigate(alert.actionHref)}
                className="gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0 shadow-md shadow-amber-500/20"
              >
                Fournir les docs
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Subtle pulsing glow */}
          <motion.div
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-amber-400/10 blur-2xl"
          />
        </motion.div>
      ))}
    </div>
  );
};

export default DocumentAlertBanner;
