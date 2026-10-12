import { Plus } from 'lucide-react';

/**
 * כפתור "הוסף רגע" צף מעל סרגל הניווט, בצורת בועה עם זנב קטן שמצביע על "בית".
 * מופיע בכל המסכים הראשיים, כך שאפשר להוסיף רגע מכל מקום.
 */
export function AddMomentButton({ onClick }: { onClick: () => void }) {
  return (
    <div
      className="pointer-events-none fixed left-1/2 z-40 -translate-x-1/2"
      style={{ bottom: 'calc(5.5rem + env(safe-area-inset-bottom, 0px))' }}
    >
      <button
        onClick={onClick}
        className="animate-pop-in pointer-events-auto relative flex flex-col items-center rounded-[1.6rem] bg-gradient-to-b from-honey-light to-honey px-7 py-2.5 text-white shadow-warm-xl transition hover:brightness-105 active:scale-95"
        aria-label="הוספת רגע חדש"
      >
        <Plus size={22} strokeWidth={2.4} />
        <span className="-mt-0.5 text-sm font-semibold">הוסף רגע</span>
        <span
          aria-hidden="true"
          className="absolute -bottom-1.5 left-1/2 h-3.5 w-3.5 -translate-x-1/2 rotate-45 rounded-sm bg-honey"
        />
      </button>
    </div>
  );
}
