import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface Props {
  icon: LucideIcon;
  title: string;
  text?: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, text, action }: Props) {
  return (
    <div className="animate-rise-in mx-auto flex max-w-sm flex-col items-center rounded-card border border-dashed border-sand-300 bg-white/60 px-6 py-10 text-center">
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-honey/15 text-honey-dark">
        <Icon size={26} strokeWidth={1.8} />
      </span>
      <p className="font-display text-xl text-ink">{title}</p>
      {text && <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
