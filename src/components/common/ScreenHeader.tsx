import type { ReactNode } from 'react';

interface Props {
  eyebrow?: string;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}

/** כותרת אחידה לכל מסכי המשנה, עם רקע גרדיאנט עדין וקשת תחתונה */
export function ScreenHeader({ eyebrow, title, children, action }: Props) {
  return (
    <header className="relative mb-6 overflow-hidden rounded-b-[2.25rem] bg-gradient-to-b from-honey-light/35 via-sand-100 to-sand-50 px-6 pb-6 pt-8 shadow-warm">
      <div className="animate-rise-in flex items-start justify-between gap-3">
        <div className="min-w-0">
          {eyebrow && <p className="text-sm text-ink-soft">{eyebrow}</p>}
          <h1 className="truncate font-display text-[1.9rem] leading-tight text-ink">{title}</h1>
        </div>
        {action}
      </div>
      {children && <div className="mt-4">{children}</div>}
    </header>
  );
}
