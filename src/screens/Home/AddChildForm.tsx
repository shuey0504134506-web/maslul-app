import { useState } from 'react';
import { X, Trash2 } from 'lucide-react';
import { createChild, updateChild, deleteChild } from '@/services/data/localDataService';
import { useAppStore } from '@/store/useAppStore';
import type { Child, Gender } from '@/types';

const THEME_COLORS = ['#C99A4B', '#8A9B76', '#B97A5E', '#6E8AA6', '#A98BC4'];

interface Props {
  child?: Child;
  onClose: () => void;
}

export function AddChildForm({ child, onClose }: Props) {
  const isEditing = !!child;

  const [name, setName] = useState(child?.name ?? '');
  const [birthDate, setBirthDate] = useState(child?.birthDate ?? '');
  const [gender, setGender] = useState<Gender>(child?.gender ?? undefined);
  const [themeColor, setThemeColor] = useState(child?.themeColor ?? THEME_COLORS[0]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { selectedChildId, setSelectedChildId } = useAppStore();

  const canSave = name.trim().length > 0 && birthDate.length > 0 && !isSaving && !isDeleting;

  async function handleSave() {
    if (!canSave) return;
    setIsSaving(true);
    setError(null);
    try {
      if (isEditing) {
        await updateChild(child.id, { name: name.trim(), birthDate, gender, themeColor });
      } else {
        const created = await createChild({ name: name.trim(), birthDate, gender, themeColor });
        setSelectedChildId(created.id);
      }
      onClose();
    } catch (err) {
      // בעבר שגיאה כאן (למשל כשרשומת המשפחה עדיין לא נטענה) נבלעה בשקט.
      // עכשיו, בזכות תיקון ה-race condition ב-App.tsx, המצב הזה כמעט לא אמור
      // לקרות - אבל אם בכל זאת קורית שגיאה אחרת, המשתמש חייב לראות אותה.
      console.error('שגיאה בשמירת ילד:', err);
      setError('לא הצלחנו לשמור כרגע. נסו שוב בעוד רגע.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!child) return;
    const confirmed = window.confirm(
      `למחוק את ${child.name} מהמסלול? כל ציוני הדרך שמשויכים רק ל${child.name} יימחקו גם הם. הפעולה לא ניתנת לביטול.`
    );
    if (!confirmed) return;

    setIsDeleting(true);
    setError(null);
    try {
      await deleteChild(child.id);
      if (selectedChildId === child.id) {
        setSelectedChildId(null);
      }
      onClose();
    } catch (err) {
      console.error('שגיאה במחיקת ילד:', err);
      setError('לא הצלחנו למחוק כרגע. נסו שוב בעוד רגע.');
      setIsDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-ink/40 backdrop-blur-sm sm:items-center sm:justify-center">
      <div className="animate-rise-in max-h-[90vh] w-full overflow-y-auto rounded-t-[2rem] bg-sand-50 p-6 shadow-warm-xl sm:max-w-md sm:rounded-card">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-xl text-ink">{isEditing ? 'עריכת פרופיל ילד' : 'ילד חדש במסלול'}</h2>
          <div className="flex items-center gap-1">
            {isEditing && (
              <button
                onClick={handleDelete}
                disabled={isSaving || isDeleting}
                className="rounded-full p-2 text-clay transition hover:bg-clay/10 disabled:opacity-40"
                aria-label="מחיקת ילד"
                title="מחיקת ילד"
              >
                <Trash2 size={18} />
              </button>
            )}
            <button onClick={onClose} className="rounded-full p-2 text-ink-soft transition hover:bg-sand-200" aria-label="סגירה">
              <X size={20} />
            </button>
          </div>
        </div>

        <label className="mb-1 block text-sm font-medium text-ink-soft">שם</label>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="שם הילד/ה"
          className="mb-4 w-full rounded-xl border border-sand-300 bg-white px-4 py-3 text-ink placeholder:text-ink-soft/60 transition focus:border-honey focus:outline-none focus:ring-2 focus:ring-honey/20"
        />

        <label className="mb-1 block text-sm font-medium text-ink-soft">תאריך לידה</label>
        <input
          type="date"
          value={birthDate}
          max={new Date().toISOString().slice(0, 10)}
          onChange={(e) => setBirthDate(e.target.value)}
          className="mb-1 w-full rounded-xl border border-sand-300 bg-white px-4 py-3 text-ink transition focus:border-honey focus:outline-none focus:ring-2 focus:ring-honey/20"
        />
        <p className="mb-4 text-xs text-ink-soft">
          אפשר להתחיל גם אם הילד/ה כבר גדול/ה - ולהשלים זיכרונות ישנים בדיעבד
        </p>

        <label className="mb-1 block text-sm font-medium text-ink-soft">מין (אופציונלי)</label>
        <div className="mb-4 flex gap-2">
          {(['boy', 'girl', 'other'] as const).map((g) => (
            <button
              key={g}
              onClick={() => setGender(gender === g ? undefined : g)}
              className={`flex-1 rounded-xl border px-3 py-2 text-sm transition ${
                gender === g ? 'border-honey bg-honey/10 text-honey-dark' : 'border-sand-300 bg-white text-ink-soft hover:border-sand-300/80'
              }`}
            >
              {g === 'boy' ? 'בן' : g === 'girl' ? 'בת' : 'אחר'}
            </button>
          ))}
        </div>

        <label className="mb-1 block text-sm font-medium text-ink-soft">צבע אישי</label>
        <div className="mb-6 flex gap-3">
          {THEME_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => setThemeColor(color)}
              aria-label={`בחירת צבע ${color}`}
              className={`h-9 w-9 rounded-full transition-all duration-200 ${
                themeColor === color ? 'ring-2 ring-offset-2 ring-ink scale-110' : 'hover:scale-105'
              }`}
              style={{ background: color }}
            />
          ))}
        </div>

        {error && (
          <p className="mb-3 rounded-xl bg-clay/10 px-4 py-2 text-sm text-clay">{error}</p>
        )}

        <button
          onClick={handleSave}
          disabled={!canSave}
          className="w-full rounded-full bg-honey py-3.5 font-medium text-white shadow-warm transition hover:bg-honey-dark active:scale-[0.98] disabled:opacity-40"
        >
          {isSaving ? 'שומר...' : isEditing ? 'עדכון' : 'התחלת המסלול'}
        </button>
      </div>
    </div>
  );
}
