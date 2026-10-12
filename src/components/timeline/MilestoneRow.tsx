import { ChevronLeft, Calendar, Heart, CloudOff, TriangleAlert } from 'lucide-react';
import { CATEGORY_STYLE } from '@/components/timeline/categories';
import { formatDate } from '@/utils/format';
import type { Milestone } from '@/types';

interface RowProps {
  milestone: Milestone;
  /** מיקום ברשימה - לאנימציית כניסה מדורגת */
  index?: number;
  /** נקודה צבעונית על קו המסלול. כבויה ברשימות רגילות (חיפוש) */
  showDot?: boolean;
  /** גיל הילד ברגע האירוע, למשל "שנה וחודשיים" */
  ageLabel?: string;
  onOpen: () => void;
}

function Thumb({ milestone }: { milestone: Milestone }) {
  const style = CATEGORY_STYLE[milestone.category];
  const Icon = style.icon;
  const image = milestone.media.find((m) => m.type === 'image' && m.storageUrl);

  if (image?.storageUrl) {
    return (
      <img
        src={image.storageUrl}
        alt=""
        loading="lazy"
        className="h-16 w-16 flex-shrink-0 rounded-2xl object-cover shadow-warm"
      />
    );
  }
  return (
    <span
      className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl"
      style={{ background: `${style.color}1F`, color: style.color }}
    >
      <Icon size={26} strokeWidth={1.7} />
    </span>
  );
}

/** שורה אחת ברשימת הציוני דרך: תמונה/אייקון, כותרת, גיל ותאריך */
export function MilestoneRow({ milestone, index = 0, showDot = true, ageLabel, onOpen }: RowProps) {
  const style = CATEGORY_STYLE[milestone.category];
  const unsynced = milestone.syncStatus !== 'synced';

  return (
    <li
      className="animate-rise-in relative flex items-stretch gap-3"
      style={{ animationDelay: `${Math.min(index, 8) * 50}ms` }}
    >
      {showDot && (
        <div className="relative w-4 flex-shrink-0">
          <span
            className="absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-[3px] border-sand-50 shadow-warm"
            style={{ background: style.color }}
          />
        </div>
      )}

      <button
        onClick={onOpen}
        className="group flex min-w-0 flex-1 items-center gap-3 rounded-card border border-sand-200/60 bg-white p-3 text-right shadow-warm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-warm-lg active:scale-[0.99]"
      >
        <Thumb milestone={milestone} />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate font-display text-lg leading-snug text-ink">{milestone.title}</h3>
            {milestone.isFavorite && (
              <Heart size={13} className="flex-shrink-0 text-clay" fill="currentColor" aria-label="מועדף" />
            )}
          </div>
          {ageLabel && <p className="mt-0.5 text-[13px] leading-snug text-ink-soft">גיל {ageLabel}</p>}
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-soft/80">
            <Calendar size={12} className="flex-shrink-0" />
            {formatDate(milestone.date)}
          </p>
        </div>

        {unsynced &&
          (milestone.syncStatus === 'failed' ? (
            <TriangleAlert size={16} className="flex-shrink-0 text-clay" aria-label="הסנכרון נכשל" />
          ) : (
            <CloudOff size={16} className="flex-shrink-0 text-ink-soft/70" aria-label="ממתין לסנכרון" />
          ))}
        <ChevronLeft
          size={18}
          className="flex-shrink-0 text-ink-soft/60 transition-transform group-hover:-translate-x-0.5"
        />
      </button>
    </li>
  );
}

interface ListProps {
  milestones: Milestone[];
  childId: string;
  themeColor: string;
  onOpen: (m: Milestone) => void;
}

/** רשימת ציוני דרך על קו אנכי עם נקודות צבעוניות - ה"מסלול" */
export function MilestoneList({ milestones, childId, themeColor, onOpen }: ListProps) {
  return (
    <ol className="relative flex flex-col gap-3">
      <span
        aria-hidden="true"
        className="absolute bottom-6 right-[7px] top-6 w-[2px] rounded-full"
        style={{ background: `linear-gradient(180deg, ${themeColor}80, ${themeColor}1A)` }}
      />
      {milestones.map((m, idx) => (
        <MilestoneRow
          key={m.id}
          index={idx}
          milestone={m}
          ageLabel={m.ageAtEvent?.[childId]?.label}
          onOpen={() => onOpen(m)}
        />
      ))}
    </ol>
  );
}
