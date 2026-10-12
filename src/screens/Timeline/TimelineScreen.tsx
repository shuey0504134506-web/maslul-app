import { useMemo, useState } from 'react';
import { ArrowUpDown, Route } from 'lucide-react';
import { useSelectedChild, useChildMilestones } from '@/hooks/useFamilyData';
import { QuickAddForm } from '@/screens/MilestoneForm/QuickAddForm';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { ChildSwitcher } from '@/components/common/ChildSwitcher';
import { EmptyState } from '@/components/common/EmptyState';
import { MilestoneList } from '@/components/timeline/MilestoneRow';
import { CATEGORY_STYLE } from '@/components/timeline/categories';
import type { Milestone, MilestoneCategory } from '@/types';

export function TimelineScreen() {
  const { children, child, isLoading } = useSelectedChild();
  const milestones = useChildMilestones(child?.id);

  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const [category, setCategory] = useState<MilestoneCategory | 'all'>('all');
  const [newestFirst, setNewestFirst] = useState(false);

  const presentCategories = useMemo(() => {
    const set = new Set<MilestoneCategory>();
    milestones?.forEach((m) => set.add(m.category));
    return [...set];
  }, [milestones]);

  const visible = useMemo(() => {
    const filtered = (milestones ?? []).filter((m) => category === 'all' || m.category === category);
    const direction = newestFirst ? -1 : 1;
    return filtered.sort((a, b) => direction * (a.date.localeCompare(b.date) || a.createdAt - b.createdAt));
  }, [milestones, category, newestFirst]);

  if (isLoading) return null;

  if (!child) {
    return (
      <div className="flex min-h-[70vh] items-center px-6">
        <EmptyState icon={Route} title="עדיין אין ילד במסלול" text="התחילו מהוספת פרופיל ילד במסך הבית." />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-48">
      <ScreenHeader
        eyebrow="המסלול של"
        title={child.name}
        action={
          <button
            onClick={() => setNewestFirst((v) => !v)}
            className="flex flex-shrink-0 items-center gap-1.5 rounded-full bg-white/80 px-3.5 py-2 text-xs font-medium text-ink-soft shadow-warm backdrop-blur transition hover:bg-white active:scale-95"
          >
            <ArrowUpDown size={14} />
            {newestFirst ? 'מהחדש לישן' : 'מהישן לחדש'}
          </button>
        }
      >
        <ChildSwitcher children={children} activeId={child.id} />

        {presentCategories.length > 1 && (
          <div className="scrollbar-none -mx-1 mt-3 flex gap-2 overflow-x-auto px-1 py-1">
            <button
              onClick={() => setCategory('all')}
              className={`flex-shrink-0 rounded-full px-3.5 py-1.5 text-sm transition ${
                category === 'all' ? 'bg-honey text-white shadow-warm' : 'bg-white/80 text-ink-soft hover:bg-white'
              }`}
            >
              הכל
            </button>
            {presentCategories.map((key) => {
              const style = CATEGORY_STYLE[key];
              const Icon = style.icon;
              const active = category === key;
              return (
                <button
                  key={key}
                  onClick={() => setCategory(active ? 'all' : key)}
                  className={`flex flex-shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm transition ${
                    active ? 'text-white shadow-warm' : 'bg-white/80 text-ink-soft hover:bg-white'
                  }`}
                  style={active ? { background: style.color } : undefined}
                >
                  <Icon size={14} />
                  {style.label}
                </button>
              );
            })}
          </div>
        )}
      </ScreenHeader>

      <div className="px-5 md:px-8">
        {visible.length === 0 ? (
          <EmptyState
            icon={Route}
            title={milestones && milestones.length > 0 ? 'אין רגעים בקטגוריה הזו' : 'המסלול עוד ריק'}
            text={
              milestones && milestones.length > 0
                ? 'נסו קטגוריה אחרת, או חזרו להצגת הכל.'
                : 'כל תחנה כאן היא רגע שתבחרו לשמר. אפשר להתחיל מהיום, או להוסיף זיכרון ישן.'
            }
          />
        ) : (
          <MilestoneList
            milestones={visible}
            childId={child.id}
            themeColor={child.themeColor}
            onOpen={setEditingMilestone}
          />
        )}
      </div>

      {editingMilestone && (
        <QuickAddForm childId={child.id} milestone={editingMilestone} onClose={() => setEditingMilestone(null)} />
      )}
    </div>
  );
}
