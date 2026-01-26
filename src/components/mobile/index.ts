// Mobile components
export { default as MobileLayout } from './MobileLayout';
export { default as MobileHeader } from './MobileHeader';
export { default as MobileBottomNav } from './MobileBottomNav';
export { default as MobilePageContainer } from './MobilePageContainer';
export { default as MobileSwipeCard } from './MobileSwipeCard';
export { default as MobileFilterSheet } from './MobileFilterSheet';
export { default as MobileSearchSheet } from './MobileSearchSheet';
export { default as MobileFAB } from './MobileFAB';
export { default as OfflineIndicator } from './OfflineIndicator';
export { default as SyncStatus } from './SyncStatus';

// Detail page components
export { default as MobileDetailHeader } from './MobileDetailHeader';
export { default as MobileWorkflowStatus } from './MobileWorkflowStatus';
export { default as MobileFinancialSummary } from './MobileFinancialSummary';
export { default as MobileEquipmentList } from './MobileEquipmentList';
export { default as MobileQuickActions } from './MobileQuickActions';
export { default as MobileActionsSheet } from './MobileActionsSheet';
export { default as MobileEquipmentDrawer } from './MobileEquipmentDrawer';
export { default as MobileClientSummaryCard } from './MobileClientSummaryCard';

// Cards
export * from './cards';

// Action helpers
export {
  createCallAction,
  createEmailAction,
  createDeleteAction,
  createMarkDoneAction,
} from './MobileSwipeCard';

// Types
export type { SwipeAction } from './MobileSwipeCard';
