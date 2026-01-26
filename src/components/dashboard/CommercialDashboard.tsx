import React, { useState, useEffect } from 'react';
import { Users } from 'lucide-react';
import { useMultiTenant } from '@/hooks/useMultiTenant';
import { useUserPreferences, DashboardLayout } from '@/hooks/useUserPreferences';
import { 
  getRecentActivity, 
  getRecentNotes, 
  getPendingTasks, 
  getCommercialStats,
  ActivityItem,
  NoteItem,
  PendingTask,
  CommercialStats
} from '@/services/commercialDashboardService';
import { CommercialStatsCard } from './cards/CommercialStatsCard';
import { RecentActivityCard } from './cards/RecentActivityCard';
import { RecentNotesCard } from './cards/RecentNotesCard';
import { PendingTasksCard } from './cards/PendingTasksCard';
import { DashboardEditMode, DashboardCard } from './DashboardEditMode';
import { toast } from 'sonner';

const DEFAULT_CARDS: DashboardCard[] = [
  { id: 'stats', label: 'Statistiques Commerciales', visible: true },
  { id: 'recent_activity', label: 'Activité Récente', visible: true },
  { id: 'pending_tasks', label: 'Tâches en Attente', visible: true },
  { id: 'recent_notes', label: 'Notes Récentes', visible: true }
];

const CommercialDashboard = () => {
  const { companyId } = useMultiTenant();
  const { preferences, updateDashboardLayout, isLoading: prefsLoading } = useUserPreferences();
  
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [tasks, setTasks] = useState<PendingTask[]>([]);
  const [stats, setStats] = useState<CommercialStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [period] = useState<'week' | 'month'>('month');

  // Récupérer la configuration des cartes depuis les préférences
  const getCardsFromPreferences = (): DashboardCard[] => {
    const layout = preferences?.dashboard_layout?.commercial;
    if (!layout?.card_order) return DEFAULT_CARDS;

    return layout.card_order.map(id => ({
      id,
      label: DEFAULT_CARDS.find(c => c.id === id)?.label || id,
      visible: layout.visible_cards?.includes(id) ?? true
    }));
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
        const [activitiesData, notesData, tasksData, statsData] = await Promise.all([
          getRecentActivity(companyId, 10),
          getRecentNotes(companyId, 8),
          getPendingTasks(companyId),
          getCommercialStats(companyId, period)
        ]);

        setActivities(activitiesData);
        setNotes(notesData);
        setTasks(tasksData);
        setStats(statsData);
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

  const renderCard = (cardId: string) => {
    switch (cardId) {
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-slate-100">
            <Users className="h-5 w-5 text-slate-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Dashboard Commercial</h2>
            <p className="text-sm text-muted-foreground">
              Suivi des dossiers et relation client
            </p>
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

      {/* Cards Grid */}
      {!isEditMode && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visibleCards.map(card => renderCard(card.id))}
        </div>
      )}
    </div>
  );
};

export default CommercialDashboard;
