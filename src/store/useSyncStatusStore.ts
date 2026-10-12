import { create } from 'zustand';
import type { PullReport } from '@/services/data/remoteDataService';

/**
 * מצב המשיכה מהענן, לתצוגה במסך ההגדרות ("מה קורה שם").
 * ה-store הזה רק משקף מצב - הוא לא משנה שום לוגיקת סנכרון.
 */
interface SyncStatusState {
  isPulling: boolean;
  lastPullAt: number | null;
  lastPullError: string | null;
  lastReport: PullReport | null;
  patch: (value: Partial<Omit<SyncStatusState, 'patch'>>) => void;
}

export const useSyncStatusStore = create<SyncStatusState>((set) => ({
  isPulling: false,
  lastPullAt: null,
  lastPullError: null,
  lastReport: null,
  patch: (value) => set(value)
}));
