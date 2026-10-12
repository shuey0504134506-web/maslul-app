import { useMemo, useState } from 'react';
import { Search as SearchIcon, SearchX, X } from 'lucide-react';
import { useSelectedChild, useChildMilestones } from '@/hooks/useFamilyData';
import { QuickAddForm } from '@/screens/MilestoneForm/QuickAddForm';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { ChildSwitcher } from '@/components/common/ChildSwitcher';
import { EmptyState } from '@/components/common/EmptyState';
import { MilestoneRow } from '@/components/timeline/MilestoneRow';
import { CATEGORY_LABELS } from '@/components/timeline/categories';
import type { Milestone } from '@/types';

/**
 * חיפוש חופשי בכל ציוני הדרך של הילד הנבחר - לפי כותרת, תיאור, מיקום או קטגוריה.
 * לחיצה על תוצאה פותחת את אותו טופס עריכה/מחיקה שמשמש בשאר המסכים.
 */
export function SearchScreen() {
  const { children, child, isLoading } = useSelectedChild();
  const milestones = useChildMilestones(child?.id);
  const [query, setQuery] = useState('');
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);

  const normalizedQuery = query.trim().toLowerCase();

  const results = useMemo(() => {
    const all = [...(milestones ?? [])].sort((a, b) => b.date.localeCompare(a.date));
    if (!normalizedQuery) return all;
    return all.filter((m) =>
      [m.title, m.description ?? '', m.location ?? '', CATEGORY_LABELS[m.category]]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery)
    );
  }, [milestones, normalizedQuery]);

  if (isLoading) return null;

  if (!child) {
    return (
      <div className="flex min-h-[70vh] items-center px-6">
        <EmptyState icon={SearchX} title="עדיין אין ילד במסלול" text="התחילו מהוספת פרופיל ילד במסך הבית." />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-48">
      <ScreenHeader title="חיפוש">
        <div className="relative">
          <SearchIcon
            size={18}
            className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-ink-soft"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`חיפוש ברגעים של ${child.name}...`}
            className="w-full rounded-full border border-sand-300 bg-white py-3 pl-11 pr-11 text-ink shadow-warm transition placeholder:text-ink-soft/60 focus:border-honey focus:outline-none focus:ring-2 focus:ring-honey/20"
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
        <div className="mt-3">
          <ChildSwitcher children={children} activeId={child.id} />
        </div>
      </ScreenHeader>

      <div className="px-5 md:px-8">
        {results.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title={normalizedQuery ? 'לא נמצאו תוצאות' : 'עדיין אין ציוני דרך'}
            text={normalizedQuery ? 'נסו מילת חיפוש אחרת.' : 'רגעים שתוסיפו יופיעו כאן.'}
          />
        ) : (
          <>
            {normalizedQuery && (
              <p className="mb-3 px-1 text-sm text-ink-soft">{results.length} תוצאות</p>
            )}
            <ul className="flex flex-col gap-3">
              {results.map((m, idx) => (
                <MilestoneRow
                  key={m.id}
                  index={idx}
                  showDot={false}
                  milestone={m}
                  ageLabel={m.ageAtEvent?.[child.id]?.label}
                  onOpen={() => setEditingMilestone(m)}
                />
              ))}
            </ul>
          </>
        )}
      </div>

      {editingMilestone && (
        <QuickAddForm childId={child.id} milestone={editingMilestone} onClose={() => setEditingMilestone(null)} />
      )}
    </div>
  );
}
