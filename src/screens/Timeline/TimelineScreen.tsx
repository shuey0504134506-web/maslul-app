import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { useAppStore } from '@/store/useAppStore';
import { TimelineStation } from '@/components/timeline/TimelineStation';

export function TimelineScreen() {
  const selectedChildId = useAppStore((s) => s.selectedChildId);

  const child = useLiveQuery(
    () => (selectedChildId ? db.children.get(selectedChildId) : undefined),
    [selectedChildId]
  );

  const milestones = useLiveQuery(async () => {
    if (!selectedChildId) return [];
    const all = await db.milestones.where('childIds').equals(selectedChildId).toArray();
    return all.sort((a, b) => a.date.localeCompare(b.date));
  }, [selectedChildId]);

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
      <header className="animate-rise-in mb-8 px-6">
        <p className="text-sm text-ink-soft">המסלול של</p>
        <h1 className="font-display text-3xl text-ink">{child.name}</h1>
      </header>

      <div className="relative px-2">
        {/* קו הדרך המרכזי */}
        <div
          className="absolute right-1/2 top-1 h-full w-[3px] translate-x-1/2 rounded-full"
          style={{ background: `linear-gradient(180deg, ${child.themeColor}66, ${child.themeColor}0D)` }}
        />

        <div className="relative flex flex-col gap-7">
          {milestones?.length === 0 && (
            <div className="animate-rise-in mx-6 rounded-card border border-dashed border-sand-300 bg-white/60 p-8 text-center">
              <p className="font-display text-lg text-ink">המסלול עוד ריק</p>
              <p className="mt-1 text-sm text-ink-soft">
                כל תחנה כאן היא רגע שתבחרו לשמר. אפשר להתחיל מהיום, או להוסיף זיכרון ישן.
              </p>
            </div>
          )}

          {milestones?.map((m, idx) => (
            <div
              key={m.id}
              className="animate-rise-in"
              style={{ animationDelay: `${Math.min(idx, 8) * 60}ms` }}
            >
              <TimelineStation
                milestone={m}
                side={idx % 2 === 0 ? 'right' : 'left'}
              ageLabel={m.ageAtEvent?.[child.id]?.label}
                themeColor={child.themeColor}
                onOpen={() => {
                  /* פתיחת כרטיס מלא - ייבנה במסך הבא */
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
