import { useCallback, useEffect, useState } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { HomeScreen } from '@/screens/Home/HomeScreen';
import { TimelineScreen } from '@/screens/Timeline/TimelineScreen';
import { GalleryScreen } from '@/screens/Gallery/GalleryScreen';
import { SearchScreen } from '@/screens/Search/SearchScreen';
import { SettingsScreen } from '@/screens/Settings/SettingsScreen';
import { AuthScreen } from '@/screens/Auth/AuthScreen';
import { QuickAddForm } from '@/screens/MilestoneForm/QuickAddForm';
import { BottomNav } from '@/components/layout/BottomNav';
import { AddMomentButton } from '@/components/layout/AddMomentButton';
import { ErrorBanner } from '@/components/common/ErrorBanner';
import { useSelectedChild } from '@/hooks/useFamilyData';
import { useAppStore } from '@/store/useAppStore';
import { syncEngine } from '@/services/sync/syncEngine';
import { auth } from '@/services/firebase/config';
import { describeError } from '@/utils/firebaseErrors';
import {
  subscribeToAuthChanges,
  subscribeToUserFamilyId,
  ensureFamilyExists
} from '@/services/auth/authService';

const familyCacheKey = (uid: string) => `maslul:family:${uid}`;

function readCachedFamily(uid: string): string | null {
  try {
    return localStorage.getItem(familyCacheKey(uid));
  } catch {
    return null;
  }
}

function writeCachedFamily(uid: string, familyId: string | null) {
  try {
    if (familyId) localStorage.setItem(familyCacheKey(uid), familyId);
  } catch {
    /* אחסון לא זמין - לא קריטי */
  }
}

interface FamilyError {
  title: string;
  message: string;
}

/** המעטפת של האפליקציה אחרי התחברות: מסכים, ניווט תחתון וכפתור "הוסף רגע" */
export function AuthenticatedShell() {
  const { child } = useSelectedChild();
  const location = useLocation();
  const [isAddOpen, setAddOpen] = useState(false);

  // בהגדרות אין טעם בכפתור הוספת רגע
  const showAddButton = !!child && location.pathname !== '/settings';

  return (
    <div className="mx-auto min-h-screen max-w-lg bg-sand-50 md:max-w-2xl">
      <main>
        <Routes>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/timeline" element={<TimelineScreen />} />
          <Route path="/gallery" element={<GalleryScreen />} />
          <Route path="/search" element={<SearchScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
        </Routes>
      </main>

      {showAddButton && <AddMomentButton onClick={() => setAddOpen(true)} />}
      <BottomNav />

      {isAddOpen && child && <QuickAddForm childId={child.id} onClose={() => setAddOpen(false)} />}
    </div>
  );
}

export default function App() {
  const { userId, isAuthLoading, setAuthInfo } = useAppStore();
  const [familyError, setFamilyError] = useState<FamilyError | null>(null);

  const checkFamily = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      await ensureFamilyExists(user);
      setFamilyError(null);
    } catch (err) {
      console.error('שגיאה ביצירת/בדיקת רשומת המשפחה:', err);
      const { code, message } = describeError(err);
      // באנר לא-חוסם (במקום alert) שמציג את הסיבה האמיתית, כדי שאפשר יהיה לתקן
      setFamilyError({
        title: 'לא הצלחנו להתחבר לנתוני המשפחה בענן',
        message: code ? `${message} (${code})` : message
      });
    }
  }, []);

  useEffect(() => {
    // מאזין למצב ההתחברות. Firebase Auth שומר סשן מקומית באופן אוטומטי,
    // ולכן גם משתמש שנכנס בעבר "יזוהה" כאן ישירות ב-onAuthStateChanged,
    // בלי לעבור דרך signInWithEmail/signUpWithEmail. משום כך חייבים לוודא
    // כאן, בכל פעם, שרשומת המשפחה שלו אכן קיימת - אחרת היא לעולם לא תיווצר.
    const unsubscribeAuth = subscribeToAuthChanges((user) => {
      if (!user) {
        setAuthInfo({ userId: null, familyId: null, isAuthLoading: false });
        syncEngine.setFamilyId(null);
        return;
      }
      setAuthInfo({ userId: user.uid });

      // פתיחה ללא אינטרנט: משתמשים ב-familyId האחרון ששמרנו במכשיר, כדי שהאפליקציה
      // תיפתח מיד עם הנתונים המקומיים (ולא תיתקע על "טוען..."). ברגע שהחיבור חוזר
      // המאזין החי למטה מאמת/מעדכן את הערך.
      const cached = readCachedFamily(user.uid);
      if (cached) {
        setAuthInfo({ familyId: cached, isAuthLoading: false });
        syncEngine.setFamilyId(cached);
      }
      // רשת אחרונה: גם אם שום דבר לא הגיע תוך כמה שניות, לא נשארים על "טוען..." לנצח
      window.setTimeout(() => {
        if (useAppStore.getState().isAuthLoading) setAuthInfo({ isAuthLoading: false });
      }, 8000);

      void checkFamily();
    });
    return unsubscribeAuth;
  }, [setAuthInfo, checkFamily]);

  useEffect(() => {
    if (!userId) return;

    // מאזין חי (לא קריאה חד-פעמית) לרשומת המשפחה. זה פותר את מרוץ התזמון:
    // ברגע שהמשפחה נכתבת בפועל בפיירסטור - העדכון מגיע אוטומטית.
    const unsubscribeFamily = subscribeToUserFamilyId(
      userId,
      (familyId) => {
        setAuthInfo({ familyId, isAuthLoading: false });
        writeCachedFamily(userId, familyId);
        // ברגע שיש familyId (כולל בהתקנה חדשה של האפליקציה, או כניסה ממכשיר
        // אחר) - מושכים את כל הנתונים הקיימים מהענן חזרה למכשיר הזה.
        syncEngine.setFamilyId(familyId);
      },
      (err) => {
        console.error('שגיאה בקריאת פרופיל המשתמש:', err);
        const { code, message } = describeError(err);
        setAuthInfo({ isAuthLoading: false });
        setFamilyError({
          title: 'לא הצלחנו לקרוא את פרופיל המשתמש בענן',
          message: code ? `${message} (${code})` : message
        });
      }
    );
    return unsubscribeFamily;
  }, [userId, setAuthInfo]);

  if (isAuthLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-sand-50">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-honey/30 border-t-honey" />
        <p className="text-sm text-ink-soft">טוען...</p>
      </div>
    );
  }

  if (!userId) {
    return <AuthScreen />;
  }

  return (
    <>
      {familyError && (
        <ErrorBanner
          title={familyError.title}
          message={familyError.message}
          onRetry={() => void checkFamily()}
          onDismiss={() => setFamilyError(null)}
        />
      )}
      <AuthenticatedShell />
    </>
  );
}
