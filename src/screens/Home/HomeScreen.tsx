import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, ChevronLeft, Sparkles, Heart } from 'lucide-react';

import { db } from '@/db/schema';
import { useAppStore } from '@/store/useAppStore';
import { calculateCurrentAge } from '@/utils/ageCalculator';
import { QuickAddForm } from '@/screens/MilestoneForm/QuickAddForm';
import { AddChildForm } from '@/screens/Home/AddChildForm';
import { JourneyBackdrop } from '@/components/decor/JourneyBackdrop';

export function HomeScreen() {
  const [isQuickAddOpen, setQuickAddOpen] = useState(false);
  const [isAddChildOpen, setAddChildOpen] = useState(false);

  const { selectedChildId, setSelectedChildId } = useAppStore();

  const children = useLiveQuery(
    () => db.children.toArray(),
    []
  );

  const child =
    children?.find((c) => c.id === selectedChildId) ??
    children?.[0];

  const lastMilestone = useLiveQuery(
    async () => {
      if (!child) return undefined;

      const all = await db.milestones
        .where('childIds')
        .equals(child.id)
        .toArray();

      return all.sort((a, b) =>
        b.date.localeCompare(a.date)
      )[0];
    },
    [child?.id]
  );

  if (children && children.length === 0) {
    return (
      <>
        <EmptyStateNoChildren
          onAddChild={() => setAddChildOpen(true)}
        />

        {isAddChildOpen && (
          <AddChildForm
            onClose={() => setAddChildOpen(false)}
          />
        )}
      </>
    );
  }

  if (!child) return null;

  const age = calculateCurrentAge(child.birthDate);

  return (
    <div className="min-h-screen pb-32">

      {/* ===== הכותרת - "מסע החיים של" ===== */}
      <div className="relative overflow-hidden rounded-b-[2.75rem] px-6 pb-12 pt-7 shadow-warm">
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(170deg, ${child.themeColor}22, #FCFAF6 78%)`
          }}
        />
        <JourneyBackdrop tint={child.themeColor} />

        <div className="relative">
          <div className="mb-5 flex items-center justify-between">
            <p className="font-display text-lg text-ink">
              מסע החיים של {child.name.split(' ')[0]}
            </p>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/70 text-honey-dark shadow-warm backdrop-blur">
              <Sparkles size={16} />
            </span>
          </div>

          {children && children.length > 1 && (
            <div className="scrollbar-none mb-6 flex gap-2 overflow-x-auto">
              {children.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedChildId(c.id)}
                  className={`flex-shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
                    c.id === child.id
                      ? 'bg-ink text-sand-50 shadow-warm'
                      : 'bg-white/70 text-ink-soft shadow-warm backdrop-blur hover:bg-white'
                  }`}
                >
                  {c.name}
                </button>
              ))}

              <button
                onClick={() => setAddChildOpen(true)}
                className="flex-shrink-0 rounded-full bg-white/70 px-3 py-1.5 text-sm text-ink-soft shadow-warm backdrop-blur transition hover:bg-white"
                aria-label="הוספת ילד נוסף"
              >
                <Plus size={16} />
              </button>
            </div>
          )}

          <div className="animate-rise-in flex flex-col items-center pt-2 text-center">
            <div
              className="mb-4 flex h-28 w-28 items-center justify-center rounded-full font-display text-4xl text-white ring-4 ring-white/80"
              style={{
                background: `linear-gradient(155deg, ${child.themeColor}, ${child.themeColor}CC)`,
                boxShadow: `0 14px 34px ${child.themeColor}45`
              }}
            >
              {child.name.charAt(0)}
            </div>

            <h1 className="font-display text-[2rem] leading-tight text-ink">
              {child.name}
            </h1>

            <span className="mt-2 rounded-full bg-white/80 px-4 py-1 text-sm text-ink-soft shadow-warm backdrop-blur">
              {age.label}
            </span>

            {children && children.length === 1 && (
              <button
                onClick={() => setAddChildOpen(true)}
                className="mt-4 text-xs font-medium text-honey-dark underline-offset-4 hover:underline"
              >
                + הוספת ילד נוסף למסלול
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ===== ציון הדרך האחרון ===== */}
      <div className="animate-rise-in -mt-6 px-6" style={{ animationDelay: '80ms' }}>
        <div className="mb-2 flex items-center gap-1.5 px-1">
          <span className="h-1.5 w-1.5 rounded-full bg-honey" />
          <p className="text-sm font-medium text-ink-soft">ציון הדרך האחרון</p>
        </div>

        {lastMilestone ? (
          <Link
            to="/timeline"
            className="block w-full rounded-card border border-sand-200/70 bg-white p-4 text-right shadow-warm transition hover:shadow-warm-lg"
          >
            <div className="flex items-center gap-3">
              {lastMilestone.isFavorite && (
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-clay/10 text-clay">
                  <Heart size={16} fill="currentColor" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-display text-lg text-ink">
                  {lastMilestone.title}
                </h3>
                <p className="mt-0.5 text-sm text-ink-soft">
                  {new Date(lastMilestone.date).toLocaleDateString('he-IL')}
                </p>
              </div>
              <ChevronLeft size={18} className="flex-shrink-0 text-ink-soft" />
            </div>
          </Link>
        ) : (
          <div className="rounded-card border border-dashed border-sand-300 bg-white/60 p-5 text-center text-sm text-ink-soft">
            עוד לא נוסף ציון דרך ראשון - כל רגע קטן שווה תיעוד 🌱
          </div>
        )}
      </div>

      {/* ===== מעבר למסלול המלא ===== */}
      <Link
        to="/timeline"
        className="animate-rise-in mx-6 mt-4 flex items-center justify-between rounded-card bg-sage/10 px-5 py-4 text-sage-dark transition hover:bg-sage/15"
        style={{ animationDelay: '140ms' }}
      >
        <span className="text-sm font-medium">לצפייה במסלול המלא</span>
        <ChevronLeft size={18} />
      </Link>

      {/* ===== כפתור הוספת רגע ===== */}
      <button
        onClick={() => setQuickAddOpen(true)}
        className="animate-pop-in fixed bottom-24 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full bg-honey px-6 py-3.5 text-white shadow-warm-xl transition hover:bg-honey-dark active:scale-95"
        style={{ animationDelay: '220ms' }}
      >
        <Plus size={20} />
        <span className="font-medium">הוסף רגע</span>
      </button>

      {isQuickAddOpen && (
        <QuickAddForm
          childId={child.id}
          onClose={() => setQuickAddOpen(false)}
        />
      )}

      {isAddChildOpen && (
        <AddChildForm
          onClose={() => setAddChildOpen(false)}
        />
      )}

    </div>
  );
}

function EmptyStateNoChildren({
  onAddChild,
}: {
  onAddChild: () => void;
}) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-8 text-center">
      <JourneyBackdrop tint="#C99A4B" />

      <div className="animate-rise-in relative">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-honey/15 text-3xl shadow-warm">
          👶
        </div>

        <h1 className="font-display text-2xl text-ink">
          ברוכים הבאים למסלול
        </h1>

        <p className="mt-2 max-w-xs text-ink-soft">
          כדי להתחיל, הוסיפו פרופיל ילד ראשון.
          אפשר גם אם הוא כבר בן כמה שנים,
          ולהשלים זיכרונות ישנים בדיעבד.
        </p>

        <button
          onClick={onAddChild}
          className="mt-6 rounded-full bg-honey px-6 py-3 font-medium text-white shadow-warm-lg transition hover:bg-honey-dark active:scale-95"
        >
          הוספת ילד ראשון
        </button>
      </div>
    </div>
  );
}
