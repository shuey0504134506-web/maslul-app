import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Search as SearchIcon, X } from 'lucide-react';
import { db } from '@/db/schema';
import { useAppStore } from '@/store/useAppStore';
import { QuickAddForm } from '@/screens/MilestoneForm/QuickAddForm';
import { SyncBadge } from '@/components/sync-status/SyncBadge';
import type { Milestone, MilestoneCategory } from '@/types';

const CATEGORY_LABELS: Record<MilestoneCategory, string> = {
  motor: 'התפתחות מוטורית',
  language: 'שפה',
  social: 'חברה ורגש',
  education: 'לימודים',
  health: 'בריאות וגדילה',
  family: 'משפחה',
  holidays: 'חגים',
  trips: 'טיולים',
  achievements: 'הישגים',
  funny: 'דברים מצחיקים',
  special: 'ציון דרך מיוחד'
};

/**
 * חיפוש חופשי בכל ציוני הדרך של הילד הנבחר - לפי כותרת, תיאור, מיקום או קטגוריה.
 * לחיצה על תוצאה פותחת את אותו טופס עריכה/מחיקה שמשמש בשאר המסכים.
 */
export function SearchScreen() {
  const selectedChildId = useAppStore((s) => s.selectedChildId);
  const [query, setQuery] = useState('');
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);

  const child = useLiveQuery(
    () => (selectedChildId ? db.children.get(selectedChildId) : undefined),
    [selectedChildId]
  );

  const allMilestones = useLiveQuery(async () => {
    if (!selectedChildId) return [];
    const all = await db.milestones.where('childIds').equals(selectedChildId).toArray();
    return all.sort((a, b) => b.date.localeCompare(a.date));
  }, [selectedChildId]);

  const normalizedQuery = query.trim().toLowerCase();
  const results =
    normalizedQuery.length === 0
      ? allMilestones ?? []
      : (allMilestones ?? []).filter((m) => {
          const haystack = [
            m.title,
            m.description ?? '',
            m.location ?? '',
            CATEGORY_LABELS[m.category]
          ]
            .join(' ')
            .toLowerCase();
          return haystack.includes(normalizedQuery);
        });

  if (!selectedChildId || !child) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
        <p className="font-display text-xl text-ink">עדיין לא נבחר ילד</p>
        <p className="mt-2 text-sm text-ink-soft">התחילו מהוספת פרופיל ילד במסך הבית</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32 pt-6">
      <header className="animate-rise-in mb-5 px-6">
        <h1 className="font-display text-3xl text-ink">חיפוש</h1>
      </header>

      <div className="animate-rise-in mb-5 px-6">
        <div className="relative">
          <SearchIcon size={18} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-ink-soft" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`חיפוש ברגעים של ${child.name}...`}
            className="w-full rounded-xl border border-sand-300 bg-white py-3 pl-4 pr-11 text-ink placeholder:text-ink-soft/60 transition focus:border-honey focus:outline-none focus:ring-2 focus:ring-honey/20"
          />
          {query.length > 0 && (
            <button
              onClick={() => setQuery('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-ink-soft transition hover:bg-sand-200"
              aria-label="ניקוי חיפוש"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="animate-rise-in mx-6 space-y-3">
        {results.length === 0 && (
          <div className="rounded-card border border-dashed border-sand-300 bg-white/60 p-8 text-center">
            <p className="font-display text-lg text-ink">
              {normalizedQuery ? 'לא נמצאו תוצאות' : 'עדיין אין ציוני דרך'}
            </p>
            {normalizedQuery && (
              <p className="mt-1 text-sm text-ink-soft">נסו מילת חיפוש אחרת</p>
            )}
          </div>
        )}

        {results.map((m) => (
          <button
            key={m.id}
            onClick={() => setEditingMilestone(m)}
            className="block w-full rounded-card border border-sand-200/60 bg-white p-4 text-right shadow-warm transition hover:shadow-warm-lg"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-display text-lg text-ink">{m.title}</h3>
                <p className="mt-0.5 text-sm text-ink-soft">
                  {new Date(m.date).toLocaleDateString('he-IL')} · {CATEGORY_LABELS[m.category]}
                  {m.location ? ` · ${m.location}` : ''}
                </p>
              </div>
              <SyncBadge status={m.syncStatus} />
            </div>
          </button>
        ))}
      </div>

      {editingMilestone && (
        <QuickAddForm
          childId={child.id}
          milestone={editingMilestone}
          onClose={() => setEditingMilestone(null)}
        />
      )}
    </div>
  );
}
