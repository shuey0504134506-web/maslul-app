import { TriangleAlert, X } from 'lucide-react';

interface Props {
  title: string;
  message: string;
  onRetry?: () => void;
  onDismiss: () => void;
}

/** באנר שגיאה לא-חוסם (במקום alert), עם אפשרות ניסיון חוזר */
export function ErrorBanner({ title, message, onRetry, onDismiss }: Props) {
  return (
    <div
      role="alert"
      className="animate-rise-in fixed inset-x-3 top-3 z-[60] mx-auto max-w-lg rounded-card border border-clay/30 bg-white p-4 shadow-warm-lg md:max-w-2xl"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-clay/10 text-clay">
          <TriangleAlert size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-ink">{title}</p>
          <p className="mt-0.5 break-words text-sm leading-relaxed text-ink-soft">{message}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-3 rounded-full bg-honey px-4 py-1.5 text-sm font-medium text-white transition hover:bg-honey-dark active:scale-95"
            >
              ניסיון חוזר
            </button>
          )}
        </div>
        <button
          onClick={onDismiss}
          className="rounded-full p-1.5 text-ink-soft transition hover:bg-sand-200"
          aria-label="סגירה"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
