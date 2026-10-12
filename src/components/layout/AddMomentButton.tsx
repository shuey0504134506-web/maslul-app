import { Plus } from 'lucide-react';

/**
 * כפתור "הוסף רגע" צף בצד שמאל, במרווח נוח מעל סרגל הניווט.
 * מופיע בכל המסכים הראשיים, כך שאפשר להוסיף רגע מכל מקום.
 */
export function AddMomentButton({ onClick }: { onClick: () => void }) {
  return (
    <div
      dir="ltr"
      className="pointer-events-none fixed left-1/2 z-40 flex w-full max-w-lg -translate-x-1/2 justify-start px-5 md:max-w-2xl"
      style={{ bottom: 'calc(7.25rem + env(safe-area-inset-bottom, 0px))' }}
    >
      <button
        onClick={onClick}
        dir="rtl"
        className="animate-pop-in pointer-events-auto flex items-center gap-2 rounded-full bg-gradient-to-b from-honey-light to-honey py-3 pl-5 pr-4 text-white shadow-warm-xl transition hover:brightness-105 active:scale-95"
        aria-label="הוספת רגע חדש"
      >
        <Plus size={22} strokeWidth={2.4} />
        <span className="text-sm font-semibold">הוסף רגע</span>
      </button>
    </div>
  );
}
