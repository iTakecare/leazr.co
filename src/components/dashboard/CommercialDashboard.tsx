import React, { useState, useEffect } from 'react';
import { Users, PhoneCall, ClipboardList, Activity, StickyNote } from 'lucide-react';
import { useMultiTenant } from '@/hooks/useMultiTenant';
import { useUserPreferences, DashboardLayout } from '@/hooks/useUserPreferences';
import {
  getRecentActivity,
  getRecentNotes,
  getPendingTasks,
  getCommercialStats,
  getConversionFunnel,
  ActivityItem,
  NoteItem,
  PendingTask,
  CommercialStats,
  FunnelStage,
} from '@/services/commercialDashboardService';
import { CommercialStatsCard } from './cards/CommercialStatsCard';
import { RecentActivityCard } from './cards/RecentActivityCard';
import { RecentNotesCard } from './cards/RecentNotesCard';
import { PendingTasksCard } from './cards/PendingTasksCard';
import { ClientsToContactCard } from './cards/ClientsToContactCard';
import { ConversionFunnelCard } from './cards/ConversionFunnelCard';
import { DashboardEditMode, DashboardCard } from './DashboardEditMode';
import { toast } from 'sonner';
import { getDashboardCallbacks, DashboardCallback } from '@/services/callLogService';
import { Card, CardContent } from '@/components/ui/card';

const DEFAULT_CARDS: DashboardCard[] = [
  { id: 'callbacks', label: 'Clients à contacter', visible: true },
  { id: 'funnel', label: 'Entonnoir de conversion', visible: true },
  { id: 'stats', label: 'Statistiques Commerciales', visible: true },
  { id: 'pending_tasks', label: 'Tâches en Attente', visible: true },
  { id: 'recent_activity', label: 'Activité Récente', visible: true },
  { id: 'recent_notes', label: 'Notes Récentes', visible: true },
];

const CommercialDashboard = () => {
  const { companyId } = useMultiTenant();
  const { preferences, updateDashboardLayout, isLoading: prefsLoading } = useUserPreferences();

  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [tasks, setTasks] = useState<PendingTask[]>([]);
  const [stats, setStats] = useState<CommercialStats | null>(null);
  const [callbacks, setCallbacks] = useState<DashboardCallback[]>([]);
  const [funnelStages, setFunnelStages] = useState<FunnelStage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [period] = useState<'week' | 'month'>('month');

  const getCardsFromPreferences = (): DashboardCard[] => {
    const layout = preferences?.dashboard_layout?.commercial;
    if (!layout?.card_order) return DEFAULT_CARDS;

    // Reconstruire à partir des préférences sauvegardées
    const savedCards = layout.card_order.map(id => ({
      id,
      label: DEFAULT_CARDS.find(c => c.id === id)?.label || id,
      visible: layout.visible_cards?.includes(id) ?? true
    }));

    // Ajouter en tête les nouvelles cartes DEFAULT absentes des préférences sauvegardées
    const savedIds = new Set(layout.card_order);
    const missingCards = DEFAULT_CARDS.filter(c => !savedIds.has(c.id));

    return [...missingCards, ...savedCards];
  };

  const [cards, setCards] = useState<DashboardCard[]>(DEFAULT_CARDS);

  useEffect(() => {
    if (!prefsLoading && preferences) {
      setCards(getCardsFromPreferences());
    }
  }, [preferences, prefsLoading]);

  useEffect(() => {
    const fetchData = async () => {
      if (!companyId) return;
      setIsLoading(true);
      try {
        const [activitiesData, notesData, tasksData, statsData, callbacksData, funnelData] = await Promise.all([
          getRecentActivity(companyId, 10),
          getRecentNotes(companyId, 8),
          getPendingTasks(companyId),
          getCommercialStats(companyId, period),
          getDashboardCallbacks(companyId, 14),
          getConversionFunnel(companyId),
        ]);
        setActivities(activitiesData);
        setNotes(notesData);
        setTasks(tasksData);
        setStats(statsData);
        setCallbacks(callbacksData);
        setFunnelStages(funnelData);
      } catch (error) {
        console.error('Error fetching commercial dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [companyId, period]);

  const handleSaveLayout = async (newCards: DashboardCard[]) => {
    setIsSaving(true);
    const layout: DashboardLayout = {
      visible_cards: newCards.filter(c => c.visible).map(c => c.id),
      card_order: newCards.map(c => c.id)
    };
    const success = await updateDashboardLayout('commercial', layout);
    if (success) {
      setCards(newCards);
      toast.success('Disposition sauvegardée');
    } else {
      toast.error('Erreur lors de la sauvegarde');
    }
    setIsSaving(false);
  };

  const visibleCards = cards.filter(c => c.visible);

  // Separate "callbacks" (full-width hero) from the rest (grid)
  const heroVisible = visibleCards.some(c => c.id === 'callbacks');
  const gridCards = visibleCards.filter(c => c.id !== 'callbacks');

  // Quick KPIs derived from data
  const overdueCount = callbacks.filter(c => {
    const d = new Date(c.callback_date);
    const t = new Date(); t.setHours(0,0,0,0);
    return d < t;
  }).length;
  const todayCount = callbacks.filter(c => {
    const d = new Date(c.callback_date).toDateString();
    return d === new Date().toDateString();
  }).length;

  const renderGridCard = (cardId: string) => {
    switch (cardId) {
      case 'funnel':
        return <ConversionFunnelCard key={cardId} stages={funnelStages} isLoading={isLoading} />;
      case 'stats':
        return <CommercialStatsCard key={cardId} stats={stats} isLoading={isLoading} period={period} />;
      case 'recent_activity':
        return <RecentActivityCard key={cardId} activities={activities} isLoading={isLoading} />;
      case 'pending_tasks':
        return <PendingTasksCard key={cardId} tasks={tasks} isLoading={isLoading} />;
      case 'recent_notes':
        return <RecentNotesCard key={cardId} notes={notes} isLoading={isLoading} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-slate-100">
            <Users className="h-5 w-5 text-slate-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Dashboard Commercial</h2>
            <p className="text-sm text-muted-foreground">Suivi des dossiers et relation client</p>
          </div>
        </div>
        <DashboardEditMode
          cards={cards}
          onSave={handleSaveLayout}
          isEditMode={isEditMode}
          setIsEditMode={setIsEditMode}
          isSaving={isSaving}
        />
      </div>

      {!isEditMode && (
        <>
          {/* Quick KPI bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="shadow-none border-slate-100">
              <CardContent className="p-3 flex items-center gap-3">
                <div className={`p-2 rounded-lg ${overdueCount > 0 ? 'bg-red-50' : 'bg-slate-50'}`}>
                  <PhoneCall className={`h-4 w-4 ${overdueCount > 0 ? 'text-red-500' : 'text-slate-400'}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground leading-none">Rappels en retard</p>
                  <p className={`text-xl font-bold leading-tight ${overdueCount > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                    {isLoading ? '–' : overdueCount}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-none border-slate-100">
              <CardContent className="p-3 flex items-center gap-3">
                <div className={`p-2 rounded-lg ${todayCount > 0 ? 'bg-orange-50' : 'bg-slate-50'}`}>
                  <PhoneCall className={`h-4 w-4 ${todayCount > 0 ? 'text-orange-500' : 'text-slate-400'}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground leading-none">Rappels aujourd'hui</p>
                  <p className={`text-xl font-bold leading-tight ${todayCount > 0 ? 'text-orange-600' : 'text-slate-400'}`}>
                    {isLoading ? '–' : todayCount}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-none border-slate-100">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-50">
                  <ClipboardList className="h-4 w-4 text-amber-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground leading-none">Tâches en attente</p>
                  <p className="text-xl font-bold leading-tight text-amber-600">
                    {isLoading ? '–' : tasks.length}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-none border-slate-100">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-sky-50">
                  <Activity className="h-4 w-4 text-sky-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground leading-none">Offres en cours</p>
                  <p className="text-xl font-bold leading-tight text-sky-600">
                    {isLoading ? '–' : (stats?.pendingOffersCount ?? '–')}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Hero: Clients à contacter (full width) */}
          {heroVisible && (
            <ClientsToContactCard callbacks={callbacks} isLoading={isLoading} />
          )}

          {/* Grid: autres cartes */}
          {gridCards.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {gridCards.map(card => renderGridCard(card.id))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CommercialDashboard;
