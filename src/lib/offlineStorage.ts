import Dexie, { Table } from 'dexie';

// Types for offline data
export interface OfflineOffer {
  id: string;
  data: any;
  syncedAt?: Date;
  isLocal?: boolean;
}

export interface OfflineClient {
  id: string;
  data: any;
  syncedAt?: Date;
  isLocal?: boolean;
}

export interface OfflineContract {
  id: string;
  data: any;
  syncedAt?: Date;
  isLocal?: boolean;
}

export interface PendingAction {
  id?: number;
  type: 'create' | 'update' | 'delete';
  entity: 'offer' | 'client' | 'contract';
  entityId: string;
  data: any;
  createdAt: Date;
  retryCount: number;
  lastError?: string;
}

export interface CacheMetadata {
  key: string;
  lastUpdated: Date;
  expiresAt?: Date;
}

// Dexie Database
class LeazrOfflineDB extends Dexie {
  offers!: Table<OfflineOffer, string>;
  clients!: Table<OfflineClient, string>;
  contracts!: Table<OfflineContract, string>;
  pendingActions!: Table<PendingAction, number>;
  cacheMetadata!: Table<CacheMetadata, string>;

  constructor() {
    super('LeazrOfflineDB');
    
    this.version(1).stores({
      offers: 'id, syncedAt, isLocal',
      clients: 'id, syncedAt, isLocal',
      contracts: 'id, syncedAt, isLocal',
      pendingActions: '++id, type, entity, entityId, createdAt',
      cacheMetadata: 'key, lastUpdated',
    });
  }
}

export const db = new LeazrOfflineDB();

// Helper functions
export async function saveOfflineOffer(offer: OfflineOffer): Promise<void> {
  await db.offers.put(offer);
}

export async function getOfflineOffers(): Promise<OfflineOffer[]> {
  return db.offers.toArray();
}

export async function saveOfflineClient(client: OfflineClient): Promise<void> {
  await db.clients.put(client);
}

export async function getOfflineClients(): Promise<OfflineClient[]> {
  return db.clients.toArray();
}

export async function saveOfflineContract(contract: OfflineContract): Promise<void> {
  await db.contracts.put(contract);
}

export async function getOfflineContracts(): Promise<OfflineContract[]> {
  return db.contracts.toArray();
}

export async function addPendingAction(action: Omit<PendingAction, 'id'>): Promise<number> {
  return db.pendingActions.add(action as PendingAction);
}

export async function getPendingActions(): Promise<PendingAction[]> {
  return db.pendingActions.orderBy('createdAt').toArray();
}

export async function removePendingAction(id: number): Promise<void> {
  await db.pendingActions.delete(id);
}

export async function updatePendingActionError(id: number, error: string): Promise<void> {
  await db.pendingActions.update(id, {
    lastError: error,
    retryCount: (await db.pendingActions.get(id))?.retryCount ?? 0 + 1,
  });
}

export async function clearAllOfflineData(): Promise<void> {
  await Promise.all([
    db.offers.clear(),
    db.clients.clear(),
    db.contracts.clear(),
    db.pendingActions.clear(),
    db.cacheMetadata.clear(),
  ]);
}

export async function updateCacheMetadata(key: string, expiresInMinutes?: number): Promise<void> {
  const now = new Date();
  await db.cacheMetadata.put({
    key,
    lastUpdated: now,
    expiresAt: expiresInMinutes 
      ? new Date(now.getTime() + expiresInMinutes * 60 * 1000)
      : undefined,
  });
}

export async function isCacheValid(key: string): Promise<boolean> {
  const metadata = await db.cacheMetadata.get(key);
  if (!metadata) return false;
  if (!metadata.expiresAt) return true;
  return new Date() < metadata.expiresAt;
}

export async function getPendingActionsCount(): Promise<number> {
  return db.pendingActions.count();
}
