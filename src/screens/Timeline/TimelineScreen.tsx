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
    <div className="pb-24 pt-6">
      <header className="mb-6 px-6">
        <p className="text-sm text-ink-soft">המסלול של</p>
        <h1 className="font-display text-2xl text-ink">{child.name}</h1>
      </header>

      <div className="relative">
        {/* קו הדרך המרכזי */}
        <div
          className="absolute right-1/2 top-0 h-full w-[2px] translate-x-1/2"
          style={{ background: `linear-gradient(180deg, ${child.themeColor}55, ${child.themeColor}11)` }}
        />

        <div className="relative flex flex-col gap-8">
          {milestones?.length === 0 && (
            <div className="mx-6 rounded-soft border border-dashed border-sand-300 p-8 text-center">
              <p className="font-display text-lg text-ink">המסלול עוד ריק</p>
              <p className="mt-1 text-sm text-ink-soft">
                כל תחנה כאן היא רגע שתבחרו לשמר. אפשר להתחיל מהיום, או להוסיף זיכרון ישן.
              </p>
            </div>
          )}

          {milestones?.map((m, idx) => (
            <TimelineStation
              key={m.id}
              milestone={m}
              side={idx % 2 === 0 ? 'right' : 'left'}
              ageLabel={m.ageAtEvent[child.id]?.label}
              onOpen={() => {
                /* פתיחת כרטיס מלא - ייבנה במסך הבא */
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
