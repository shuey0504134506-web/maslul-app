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

const SELECTED_CHILD_KEY = 'maslul:selected-child';

function readSelectedChild(): string | null {
  try {
    return localStorage.getItem(SELECTED_CHILD_KEY);
  } catch {
    return null;
  }
}

export const useAppStore = create<AppState>((set) => ({
  // נשמר בין הפעלות, כדי שאחרי פתיחה מחדש של האפליקציה יוצג אותו ילד
  selectedChildId: readSelectedChild(),
  isOnline: navigator.onLine,
  userId: null,
  familyId: null,
  isAuthLoading: true,
  setSelectedChildId: (id) => {
    try {
      if (id) localStorage.setItem(SELECTED_CHILD_KEY, id);
      else localStorage.removeItem(SELECTED_CHILD_KEY);
    } catch {
      /* אחסון לא זמין - לא קריטי */
    }
    set({ selectedChildId: id });
  },
  setOnline: (isOnline) => set({ isOnline }),
  setAuthInfo: (info) => set(info)
}));

// עדכון אוטומטי של מצב הרשת בסטור, לשימוש בכל רכיב UI (למשל תג הסנכרון)
window.addEventListener('online', () => useAppStore.getState().setOnline(true));
window.addEventListener('offline', () => useAppStore.getState().setOnline(false));
