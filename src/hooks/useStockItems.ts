import { useQuery } from "@tanstack/react-query";
import { useMultiTenant } from "@/hooks/useMultiTenant";
import { fetchStockItems, fetchStockCounts, fetchMovements, fetchRepairs, StockStatus, RepairStatus } from "@/services/stockService";

export const useStockItems = (statusFilter?: StockStatus) => {
  const { companyId } = useMultiTenant();

  const { data: items = [], isLoading, refetch } = useQuery({
    queryKey: ['stock-items', companyId, statusFilter],
    queryFn: () => fetchStockItems(companyId!, statusFilter),
    enabled: !!companyId,
  });

  return { items, isLoading, refetch };
};

export const useStockCounts = () => {
  const { companyId } = useMultiTenant();

  const { data: counts, isLoading } = useQuery({
    queryKey: ['stock-counts', companyId],
    queryFn: () => fetchStockCounts(companyId!),
    enabled: !!companyId,
  });

  return { counts: counts || { ordered: 0, in_stock: 0, assigned: 0, in_repair: 0, sold: 0, scrapped: 0, total: 0 }, isLoading };
};

export const useStockMovements = (stockItemId?: string) => {
  const { companyId } = useMultiTenant();

  const { data: movements = [], isLoading, refetch } = useQuery({
    queryKey: ['stock-movements', companyId, stockItemId],
    queryFn: () => fetchMovements(companyId!, stockItemId),
    enabled: !!companyId,
  });

  return { movements, isLoading, refetch };
};

export const useStockRepairs = (statusFilter?: RepairStatus) => {
  const { companyId } = useMultiTenant();

  const { data: repairs = [], isLoading, refetch } = useQuery({
    queryKey: ['stock-repairs', companyId, statusFilter],
    queryFn: () => fetchRepairs(companyId!, statusFilter),
    enabled: !!companyId,
  });

  return { repairs, isLoading, refetch };
};
