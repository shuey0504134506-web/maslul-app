import { useState } from 'react';
import { X } from 'lucide-react';
import { createChild } from '@/services/data/localDataService';
import { useAppStore } from '@/store/useAppStore';
import type { Gender } from '@/types';

const THEME_COLORS = ['#C99A4B', '#8A9B76', '#B97A5E', '#6E8AA6', '#A98BC4'];

export function AddChildForm({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<Gender>(undefined);
  const [themeColor, setThemeColor] = useState(THEME_COLORS[0]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setSelectedChildId = useAppStore((s) => s.setSelectedChildId);

  const canSave = name.trim().length > 0 && birthDate.length > 0 && !isSaving;

  async function handleSave() {
    if (!canSave) return;
    setIsSaving(true);
    setError(null);
    try {
      const child = await createChild({ name: name.trim(), birthDate, gender, themeColor });
      setSelectedChildId(child.id);
      onClose();
    } catch (err) {
      // בעבר שגיאה כאן (למשל כשרשומת המשפחה עדיין לא נטענה) נבלעה בשקט.
      // עכשיו, בזכות תיקון ה-race condition ב-App.tsx, המצב הזה כמעט לא אמור
      // לקרות - אבל אם בכל זאת קורית שגיאה אחרת, המשתמש חייב לראות אותה.
      console.error('שגיאה בשמירת ילד חדש:', err);
      setError('לא הצלחנו לשמור כרגע. נסו שוב בעוד רגע.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-ink/40 backdrop-blur-sm sm:items-center sm:justify-center">
      <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-[2rem] bg-sand-50 p-6 sm:max-w-md sm:rounded-soft">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl text-ink">ילד חדש במסלול</h2>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-sand-200" aria-label="סגירה">
            <X size={20} />
          </button>
        </div>

        <label className="mb-1 block text-sm font-medium text-ink-soft">שם</label>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="שם הילד/ה"
          className="mb-4 w-full rounded-xl border border-sand-300 bg-white px-4 py-3 text-ink placeholder:text-ink-soft/60 focus:border-honey"
        />

        <label className="mb-1 block text-sm font-medium text-ink-soft">תאריך לידה</label>
        <input
          type="date"
          value={birthDate}
          max={new Date().toISOString().slice(0, 10)}
          onChange={(e) => setBirthDate(e.target.value)}
          className="mb-1 w-full rounded-xl border border-sand-300 bg-white px-4 py-3 text-ink focus:border-honey"
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
                gender === g ? 'border-honey bg-honey/10 text-honey-dark' : 'border-sand-300 bg-white text-ink-soft'
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
              className={`h-9 w-9 rounded-full transition ${
                themeColor === color ? 'ring-2 ring-offset-2 ring-ink' : ''
              }`}
              style={{ background: color }}
            />
          ))}
        </div>

        {error && (
          <p className="mb-3 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>
        )}

        <button
          onClick={handleSave}
          disabled={!canSave}
          className="w-full rounded-full bg-honey py-3.5 font-medium text-white transition hover:bg-honey-dark disabled:opacity-40"
        >
          {isSaving ? 'שומר...' : 'התחלת המסלול'}
        </button>
      </div>
    </div>
  );
}
