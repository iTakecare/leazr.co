
import { formatDate, formatCurrency } from "@/lib/utils";
import { formatDistanceToNow as formatDistanceToNowFns, format } from 'date-fns';
import { fr } from 'date-fns/locale';

export { formatDate, formatCurrency };

export function formatPercentage(value: number): string {
  return `${value}%`;
}

export function formatDistanceToNow(date: Date | string | number): string {
  const parsedDate = typeof date === 'string' ? new Date(date) : date;
  return formatDistanceToNowFns(parsedDate, { addSuffix: true, locale: fr });
}

export function formatDateToFrench(date: Date | string | number): string {
  const parsedDate = typeof date === 'string' ? new Date(date) : date;
  return format(parsedDate, 'dd/MM/yyyy', { locale: fr });
}
