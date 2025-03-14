
import { useState, useEffect } from 'react';
import { getDashboardStats, getRecentActivity, TimeFilter, DashboardStats } from '@/services/dashboardService';

export const useDashboard = () => {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('month');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const statsData = await getDashboardStats(timeFilter);
      const activityData = await getRecentActivity(10);
      
      setStats(statsData);
      setRecentActivity(activityData);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Impossible de charger les données du tableau de bord');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [timeFilter]);

  const refreshData = () => {
    fetchDashboardData();
  };

  return {
    stats,
    recentActivity,
    isLoading,
    error,
    timeFilter,
    setTimeFilter,
    refreshData
  };
};
