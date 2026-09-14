import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, ChevronLeft } from 'lucide-react';
import { db } from '@/db/schema';
import { useAppStore } from '@/store/useAppStore';
import { calculateCurrentAge } from '@/utils/ageCalculator';
import { QuickAddForm } from '@/screens/MilestoneForm/QuickAddForm';
import { AddChildForm } from '@/screens/Home/AddChildForm';

export function HomeScreen() {
  const [isQuickAddOpen, setQuickAddOpen] = useState(false);
  const [isAddChildOpen, setAddChildOpen] = useState(false);
  const { selectedChildId, setSelectedChildId } = useAppStore();

  const children = useLiveQuery(() => db.children.toArray(), []);
  const child = children?.find((c) => c.id === selectedChildId) ?? children?.[0];

  const lastMilestone = useLiveQuery(async () => {
    if (!child) return undefined;
    const all = await db.milestones.where('childIds').equals(child.id).toArray();
    return all.sort((a, b) => b.date.localeCompare(a.date))[0];
  }, [child?.id]);

  if (children && children.length === 0) {
    return (
      <>
        <EmptyStateNoChildren onAddChild={() => setAddChildOpen(true)} />
        {isAddChildOpen && <AddChildForm onClose={() => setAddChildOpen(false)} />}
      </>
    );
  }

  if (!child) return null;

  const age = calculateCurrentAge(child.birthDate);

  return (
    <div className="min-h-screen pb-28">
      {/* אזור עליון - "כרטיס הילד" */}
      <div
        className="rounded-b-[2.5rem] px-6 pb-10 pt-8"
        style={{ background: `linear-gradient(160deg, ${child.themeColor}26, #FCFAF6)` }}
      >
        {children && children.length > 0 && (
          <div className="mb-6 flex gap-2 overflow-x-auto">
            {children.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedChildId(c.id)}
                className={`flex-shrink-0 rounded-full px-4 py-1.5 text-sm transition ${
                  c.id === child.id
                    ? 'bg-ink text-sand-50'
                    : 'bg-white text-ink-soft shadow-sm'
                }`}
              >
                {c.name}
              </button>
            ))}
            <button
              onClick={() => setAddChildOpen(true)}
              className="flex-shrink-0 rounded-full bg-white px-3 py-1.5 text-sm text-ink-soft shadow-sm"
              aria-label="הוספת ילד נוסף"
            >
              <Plus size={16} />
            </button>
          </div>
        )}

        <div className="flex flex-col items-center text-center">
          <div
            className="mb-4 flex h-24 w-24 items-center justify-center rounded-full text-3xl font-display text-white shadow-md"
            style={{ background: child.themeColor }}
          >
            {child.name.charAt(0)}
          </div>
          <h1 className="font-display text-3xl text-ink">{child.name}</h1>
          <p className="mt-1 text-ink-soft">{age.label}</p>
        </div>
      </div>

      {/* ציון דרך אחרון */}
      <div className="mt-6 px-6">
        <p className="mb-2 text-sm font-medium text-ink-soft">ציון הדרך האחרון</p>
        {lastMilestone ? (
          <div className="rounded-soft bg-white p-4 shadow-[0_2px_10px_rgba(43,38,33,0.06)]">
            <h3 className="font-display text-lg text-ink">{lastMilestone.title}</h3>
            <p className="mt-1 text-sm text-ink-soft">
              {new Date(lastMilestone.date).toLocaleDateString('he-IL')}
            </p>
          </div>
        ) : (
          <div className="rounded-soft border border-dashed border-sand-300 p-4 text-center text-sm text-ink-soft">
            עוד לא נוסף ציון דרך ראשון
          </div>
        )}
      </div>

      <a
        href="#/timeline"
        className="mt-4 flex items-center justify-between px-6 py-3 text-sm text-honey-dark"
      >
        <span className="flex items-center gap-1">
          לצפייה במסלול המלא <ChevronLeft size={16} />
        </span>
      </a>

      {/* כפתור הוספה מהירה - צף */}
      <button
        onClick={() => setQuickAddOpen(true)}
        className="fixed bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-honey px-6 py-3.5 text-white shadow-[0_6px_20px_rgba(201,154,75,0.4)] transition hover:bg-honey-dark"
      >
        <Plus size={20} />
        <span className="font-medium">הוסף רגע</span>
      </button>

      {isQuickAddOpen && child && (
        <QuickAddForm childId={child.id} onClose={() => setQuickAddOpen(false)} />
      )}
      {isAddChildOpen && <AddChildForm onClose={() => setAddChildOpen(false)} />}
    </div>
  );
}

function EmptyStateNoChildren({ onAddChild }: { onAddChild: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-8 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-honey/15 text-3xl">
        👶
      </div>
      <h1 className="font-display text-2xl text-ink">ברוכים הבאים למסלול</h1>
      <p className="mt-2 max-w-xs text-ink-soft">
        כדי להתחיל, הוסיפו פרופיל ילד ראשון - אפשר גם אם הוא כבר בן כמה שנים, ולהשלים זיכרונות
        ישנים בדיעבד.
      </p>
      <button
        onClick={onAddChild}
        className="mt-6 rounded-full bg-ink px-6 py-3 font-medium text-sand-50"
      >
        הוספת ילד ראשון
      </button>
    </div>
  );
}
