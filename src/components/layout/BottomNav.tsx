import { NavLink } from 'react-router-dom';
import { Home, Route, Image, Search, Settings } from 'lucide-react';

/**
 * הסדר כאן הוא הסדר מימין לשמאל (האפליקציה RTL): "בית" באמצע,
 * "מסלול" ו"גלריה" מימינו, "חיפוש" ו"הגדרות" משמאלו.
 */
const NAV_ITEMS = [
  { to: '/timeline', label: 'מסלול', icon: Route },
  { to: '/gallery', label: 'גלריה', icon: Image },
  { to: '/', label: 'בית', icon: Home, end: true },
  { to: '/search', label: 'חיפוש', icon: Search },
  { to: '/settings', label: 'הגדרות', icon: Settings }
];

export function BottomNav() {
  return (
    <nav
      className="pb-safe fixed bottom-0 left-1/2 z-40 w-full max-w-lg -translate-x-1/2 px-3 md:max-w-2xl"
      aria-label="ניווט ראשי"
    >
      <div className="flex items-center justify-around gap-1 rounded-[2rem] border border-sand-200/70 bg-white/95 px-2 py-2 shadow-warm-lg backdrop-blur">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium transition-all duration-200 ${
                isActive ? 'bg-honey/15 text-honey-dark' : 'text-ink-soft hover:bg-sand-100 hover:text-ink'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={21} strokeWidth={isActive ? 2.2 : 1.7} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
