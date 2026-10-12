import { useAppStore } from '@/store/useAppStore';
import type { Child } from '@/types';

/** שורת "פילים" להחלפת הילד הפעיל - מוצגת רק כשיש יותר מילד אחד */
export function ChildSwitcher({ children, activeId }: { children: Child[] | undefined; activeId?: string }) {
  const setSelectedChildId = useAppStore((s) => s.setSelectedChildId);
  if (!children || children.length < 2) return null;

  return (
    <div className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1 py-1" role="tablist" aria-label="בחירת ילד">
      {children.map((c) => {
        const active = c.id === activeId;
        return (
          <button
            key={c.id}
            role="tab"
            aria-selected={active}
            onClick={() => setSelectedChildId(c.id)}
            className={`flex-shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
              active
                ? 'bg-ink text-sand-50 shadow-warm'
                : 'bg-white/80 text-ink-soft shadow-warm backdrop-blur hover:bg-white'
            }`}
          >
            {c.name}
          </button>
        );
      })}
    </div>
  );
}
