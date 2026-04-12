import { initStorage } from './storage';
import { initSync } from './sync';

// Offline Support - Public API
export * from './types';
export * from './wrapper';
export { 
  initSync, 
  syncQueue, 
  triggerManualSync, 
  startSyncListener 
} from './sync';
export { 
  initStorage,
  getPending,
  getPendingCount 
} from './storage';
export { 
  useIsOnline
} from './network';

// Init everything
export async function initOfflineSupport() {
  console.log('🚀 Initializing offline support...');
  await initStorage();
  await initSync();
  console.log('✅ Offline support ready');
}
