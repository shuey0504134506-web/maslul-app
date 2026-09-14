import { useEffect } from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import { Home, Milestone as MilestoneIcon, Image, Search, Settings } from 'lucide-react';
import { HomeScreen } from '@/screens/Home/HomeScreen';
import { TimelineScreen } from '@/screens/Timeline/TimelineScreen';
import { AuthScreen } from '@/screens/Auth/AuthScreen';
import { useAppStore } from '@/store/useAppStore';
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
    });
    return unsubscribeFamily;
  }, [userId, setAuthInfo]);

  if (isAuthLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-sand-50">
        <p className="text-ink-soft">טוען...</p>
      </div>
    );
  }

  if (!userId) {
    return <AuthScreen />;
  }

  return (
    <div className="mx-auto min-h-screen max-w-lg bg-sand-50">
      <main>
        <Routes>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/timeline" element={<TimelineScreen />} />
          {/* שאר המסכים (גלריה, חיפוש, הגדרות וכו') ייבנו בהמשך לפי סדר העבודה במסמך הארכיטקטורה */}
        </Routes>
      </main>

      <nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-lg -translate-x-1/2 border-t border-sand-200 bg-white/95 px-4 pb-safe backdrop-blur">
        <div className="flex items-center justify-around py-2">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 rounded-xl px-3 py-1.5 text-xs transition ${
                  isActive ? 'text-honey-dark' : 'text-ink-soft'
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
