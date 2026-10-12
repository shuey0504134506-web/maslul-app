import { useMemo, useState } from 'react';
import { Images, Loader2 } from 'lucide-react';
import { useSelectedChild, useChildMilestones } from '@/hooks/useFamilyData';
import { QuickAddForm } from '@/screens/MilestoneForm/QuickAddForm';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { ChildSwitcher } from '@/components/common/ChildSwitcher';
import { EmptyState } from '@/components/common/EmptyState';
import type { Milestone, MediaRef } from '@/types';

interface Tile {
  key: string;
  milestone: Milestone;
  media: MediaRef;
}

/**
 * גלריה: כל התמונות של הילד הנבחר, בסריג. כל תמונה היא אריח נפרד
 * (בעבר הוצגה רק התמונה הראשונה בכל רגע).
 * לחיצה על אריח פותחת את אותו טופס עריכה/מחיקה שמשמש במסך המסלול.
 */
export function GalleryScreen() {
  const { children, child, isLoading } = useSelectedChild();
  const milestones = useChildMilestones(child?.id);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);

  const tiles = useMemo<Tile[]>(() => {
    const result: Tile[] = [];
    [...(milestones ?? [])]
      .sort((a, b) => b.date.localeCompare(a.date))
      .forEach((m) => {
        m.media
          .filter((media) => media.type === 'image')
          .forEach((media) => result.push({ key: `${m.id}-${media.id}`, milestone: m, media }));
      });
    return result;
  }, [milestones]);

  if (isLoading) return null;

  if (!child) {
    return (
      <div className="flex min-h-[70vh] items-center px-6">
        <EmptyState icon={Images} title="עדיין אין ילד במסלול" text="התחילו מהוספת פרופיל ילד במסך הבית." />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-48">
      <ScreenHeader eyebrow="הגלריה של" title={child.name}>
        <div className="flex flex-wrap items-center gap-3">
          <ChildSwitcher children={children} activeId={child.id} />
          {tiles.length > 0 && <span className="text-sm text-ink-soft">{tiles.length} תמונות</span>}
        </div>
      </ScreenHeader>

      <div className="px-3 md:px-6">
        {tiles.length === 0 ? (
          <EmptyState
            icon={Images}
            title="עדיין אין תמונות"
            text="תמונות שמצורפות לרגעים במסלול יופיעו כאן אוטומטית."
          />
        ) : (
          <div className="grid grid-cols-3 gap-2 md:grid-cols-4">
            {tiles.map(({ key, milestone, media }, idx) => (
              <button
                key={key}
                onClick={() => setEditingMilestone(milestone)}
                className="animate-pop-in group relative aspect-square overflow-hidden rounded-2xl bg-sand-200 shadow-warm"
                style={{ animationDelay: `${Math.min(idx, 12) * 30}ms` }}
              >
                {media.storageUrl ? (
                  <img
                    src={media.storageUrl}
                    alt={milestone.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-xs text-ink-soft">
                    <Loader2 size={18} className="animate-spin" />
                    מעלה...
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/65 to-transparent p-2 pt-6">
                  <p className="truncate text-right text-[11px] font-medium text-white">{milestone.title}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {editingMilestone && (
        <QuickAddForm childId={child.id} milestone={editingMilestone} onClose={() => setEditingMilestone(null)} />
      )}
    </div>
  );
}
