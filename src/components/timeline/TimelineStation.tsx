import type { Milestone, MilestoneCategory } from '@/types';
import { SyncBadge } from '@/components/sync-status/SyncBadge';

const CATEGORY_STYLE: Record<MilestoneCategory, { icon: string; color: string }> = {
  motor: { icon: '🤸', color: '#8A9B76' },
  language: { icon: '💬', color: '#C99A4B' },
  social: { icon: '🤍', color: '#B97A5E' },
  education: { icon: '📚', color: '#6E8AA6' },
  health: { icon: '🌱', color: '#8A9B76' },
  family: { icon: '👨‍👩‍👧', color: '#B97A5E' },
  holidays: { icon: '✨', color: '#C99A4B' },
  trips: { icon: '🧭', color: '#6E8AA6' },
  achievements: { icon: '🏅', color: '#C99A4B' },
  funny: { icon: '😄', color: '#B97A5E' },
  special: { icon: '⭐', color: '#8A9B76' }
};

interface Props {
  milestone: Milestone;
  side: 'right' | 'left';
  ageLabel?: string;
  onOpen: () => void;
}

export function TimelineStation({ milestone, side, ageLabel, onOpen }: Props) {
  const style = CATEGORY_STYLE[milestone.category];
  const coverImage = milestone.media.find((m) => m.type === 'image');

  return (
    <div className={`relative flex w-full ${side === 'right' ? 'justify-start' : 'justify-end'}`}>
      {/* נקודת העוגן על הקו האנכי המרכזי */}
      <div
        className="absolute top-6 h-4 w-4 rounded-full border-2 border-sand-50 shadow-sm"
        style={{ background: style.color, [side === 'right' ? 'right' : 'left']: '-8px' } as React.CSSProperties}
      />

      <button
        onClick={onOpen}
        className={`w-[85%] rounded-soft bg-white p-4 text-right shadow-[0_2px_10px_rgba(43,38,33,0.06)] transition hover:shadow-[0_4px_16px_rgba(43,38,33,0.1)] ${
          side === 'right' ? 'ml-auto mr-6' : 'mr-auto ml-6'
        }`}
      >
        <div className="mb-2 flex items-center justify-between">
          <span
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-base"
            style={{ background: `${style.color}22` }}
          >
            {style.icon}
          </span>
          {milestone.isFavorite && <span className="text-honey-dark">★</span>}
        </div>

        {coverImage?.storageUrl && (
          <img
            src={coverImage.storageUrl}
            alt=""
            className="mb-3 h-32 w-full rounded-xl object-cover"
          />
        )}

        <h3 className="font-display text-lg leading-snug text-ink">{milestone.title}</h3>
        {ageLabel && <p className="mt-1 text-sm text-ink-soft">{ageLabel}</p>}
        {milestone.description && (
          <p className="mt-2 line-clamp-2 text-sm text-ink-soft">{milestone.description}</p>
        )}

        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-ink-soft">
            {new Date(milestone.date).toLocaleDateString('he-IL')}
          </span>
          <SyncBadge status={milestone.syncStatus} />
        </div>
      </button>
    </div>
  );
}
