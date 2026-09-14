import { create } from 'zustand';

interface AuthInfo {
  userId: string | null;
  familyId: string | null;
  isAuthLoading: boolean;
}

interface AppState extends AuthInfo {
  selectedChildId: string | null;
  isOnline: boolean;
  setSelectedChildId: (id: string | null) => void;
  setOnline: (isOnline: boolean) => void;
  setAuthInfo: (info: Partial<AuthInfo>) => void;
}

export const useAppStore = create<AppState>((set) => ({
  selectedChildId: null,
  isOnline: navigator.onLine,
  userId: null,
  familyId: null,
  isAuthLoading: true,
  setSelectedChildId: (id) => set({ selectedChildId: id }),
  setOnline: (isOnline) => set({ isOnline }),
  setAuthInfo: (info) => set(info)
}));

// עדכון אוטומטי של מצב הרשת בסטור, לשימוש בכל רכיב UI (למשל תג הסנכרון)
window.addEventListener('online', () => useAppStore.getState().setOnline(true));
window.addEventListener('offline', () => useAppStore.getState().setOnline(false));
