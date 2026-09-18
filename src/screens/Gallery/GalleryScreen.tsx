import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { useAppStore } from '@/store/useAppStore';
import { QuickAddForm } from '@/screens/MilestoneForm/QuickAddForm';
import type { Milestone } from '@/types';

/**
 * גלריה: כל הרגעים בעלי מדיה (תמונה/וידאו) של הילד הנבחר, בסריג.
 * לחיצה על תמונה פותחת את אותו טופס עריכה/מחיקה שמשמש במסך המסלול.
 */
export function GalleryScreen() {
  const selectedChildId = useAppStore((s) => s.selectedChildId);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);

  const child = useLiveQuery(
    () => (selectedChildId ? db.children.get(selectedChildId) : undefined),
    [selectedChildId]
  );

  const milestonesWithMedia = useLiveQuery(async () => {
    if (!selectedChildId) return [];
    const all = await db.milestones.where('childIds').equals(selectedChildId).toArray();
    return all
      .filter((m) => m.media.some((media) => media.type === 'image'))
      .sort((a, b) => b.date.localeCompare(a.date));
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
      <header className="animate-rise-in mb-6 px-6">
        <p className="text-sm text-ink-soft">הגלריה של</p>
        <h1 className="font-display text-3xl text-ink">{child.name}</h1>
      </header>

      {milestonesWithMedia?.length === 0 && (
        <div className="animate-rise-in mx-6 rounded-card border border-dashed border-sand-300 bg-white/60 p-8 text-center">
          <p className="font-display text-lg text-ink">עדיין אין תמונות</p>
          <p className="mt-1 text-sm text-ink-soft">
            תמונות שמצורפות לרגעים במסלול יופיעו כאן אוטומטית.
          </p>
        </div>
      )}

      <div className="animate-rise-in grid grid-cols-3 gap-1.5 px-1.5">
        {milestonesWithMedia?.map((m) => {
          const image = m.media.find((media) => media.type === 'image');
          return (
            <button
              key={m.id}
              onClick={() => setEditingMilestone(m)}
              className="group relative aspect-square overflow-hidden rounded-xl bg-sand-200"
            >
              {image?.storageUrl ? (
                <img
                  src={image.storageUrl}
                  alt={m.title}
                  className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-ink-soft">
                  מעלה...
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/60 to-transparent p-2">
                <p className="truncate text-right text-[11px] font-medium text-white">{m.title}</p>
              </div>
            </button>
          );
        })}
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
