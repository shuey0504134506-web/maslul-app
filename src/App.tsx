import { useEffect } from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import { Home, Milestone as MilestoneIcon, Image, Search, Settings } from 'lucide-react';
import { HomeScreen } from '@/screens/Home/HomeScreen';
import { TimelineScreen } from '@/screens/Timeline/TimelineScreen';
import { AuthScreen } from '@/screens/Auth/AuthScreen';
import { useAppStore } from '@/store/useAppStore';
import { syncEngine } from '@/services/sync/syncEngine';
import {
  subscribeToAuthChanges,
  subscribeToUserFamilyId,
  ensureFamilyExists
} from '@/services/auth/authService';

const NAV_ITEMS = [
  { to: '/', label: 'בית', icon: Home, end: true },
  { to: '/timeline', label: 'מסלול', icon: MilestoneIcon },
  { to: '/gallery', label: 'גלריה', icon: Image },
  { to: '/search', label: 'חיפוש', icon: Search },
  { to: '/settings', label: 'הגדרות', icon: Settings }
];

export default function App() {
  const { userId, isAuthLoading, setAuthInfo } = useAppStore();

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
      ensureFamilyExists(user).catch((err) => {
        console.error('שגיאה ביצירת/בדיקת רשומת המשפחה:', err);
      });
    });
    return unsubscribeAuth;
  }, [setAuthInfo]);

  useEffect(() => {
    if (!userId) return;

    // מאזין חי (לא קריאה חד-פעמית) לרשומת המשפחה. זה פותר את מרוץ התזמון:
    // ברגע שהמשפחה נכתבת בפועל בפיירסטור - העדכון מגיע אוטומטית.
    const unsubscribeFamily = subscribeToUserFamilyId(userId, (familyId) => {
      setAuthInfo({ familyId, isAuthLoading: false });
      // ברגע שיש familyId (כולל בהתקנה חדשה של האפליקציה, או כניסה ממכשיר
      // אחר) - מושכים את כל הנתונים הקיימים מהענן חזרה למכשיר הזה.
      syncEngine.setFamilyId(familyId);
    });
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
    <div className="mx-auto min-h-screen max-w-lg bg-sand-50 md:max-w-2xl">
      <main>
        <Routes>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/timeline" element={<TimelineScreen />} />
          {/* שאר המסכים (גלריה, חיפוש, הגדרות וכו') ייבנו בהמשך לפי סדר העבודה במסמך הארכיטקטורה */}
        </Routes>
      </main>

      <nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-lg -translate-x-1/2 px-3 pb-safe pb-3 md:max-w-2xl">
        <div className="flex items-center justify-around gap-1 rounded-[2rem] border border-sand-200/70 bg-white/95 px-2 py-2 shadow-warm-lg backdrop-blur">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-1 rounded-2xl px-3 py-2 text-xs font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-honey/12 text-honey-dark'
                    : 'text-ink-soft hover:bg-sand-100 hover:text-ink'
                }`
              }
            >
              <Icon size={20} />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
