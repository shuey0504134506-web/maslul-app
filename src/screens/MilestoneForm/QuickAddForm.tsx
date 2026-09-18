import { useState } from 'react';
import { X, Camera, ChevronDown, Trash2 } from 'lucide-react';
import { createMilestone, updateMilestone, deleteMilestone } from '@/services/data/localDataService';
import { saveMediaLocally } from '@/services/media/mediaService';
import { db } from '@/db/schema';
import type { Milestone, MilestoneCategory } from '@/types';

/**
 * טופס הוספה/עריכה של רגע.
 * אם מועבר `milestone` - הטופס נפתח במצב עריכה: השדות מתמלאים מראש,
 * השמירה מעדכנת את הרשומה הקיימת (ולא יוצרת חדשה), ומוצג כפתור מחיקה.
 * ברירת המחדל (ללא milestone): מצב יצירה, בדיוק כמו קודם.
 */

const CATEGORY_LABELS: Record<MilestoneCategory, string> = {
  motor: 'התפתחות מוטורית',
  language: 'שפה',
  social: 'חברה ורגש',
  education: 'לימודים',
  health: 'בריאות וגדילה',
  family: 'משפחה',
  holidays: 'חגים',
  trips: 'טיולים',
  achievements: 'הישגים',
  funny: 'דברים מצחיקים',
  special: 'ציון דרך מיוחד'
};

interface Props {
  childId: string;
  milestone?: Milestone;
  onClose: () => void;
}

export function QuickAddForm({ childId, milestone, onClose }: Props) {
  const isEditing = !!milestone;

  const [title, setTitle] = useState(milestone?.title ?? '');
  const [date, setDate] = useState(milestone?.date ?? new Date().toISOString().slice(0, 10));
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showMore, setShowMore] = useState(isEditing);
  const [description, setDescription] = useState(milestone?.description ?? '');
  const [category, setCategory] = useState<MilestoneCategory>(milestone?.category ?? 'special');
  const [location, setLocation] = useState(milestone?.location ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const existingCoverImage = milestone?.media.find((m) => m.type === 'image');
  const canSave = title.trim().length > 0 && !isSaving && !isDeleting;

  async function handleSave() {
    if (!canSave) return;
    setIsSaving(true);
    setError(null);
    try {
      if (isEditing) {
        await updateMilestone(milestone.id, {
          title: title.trim(),
          description: description.trim() || undefined,
          date,
          category,
          location: location.trim() || undefined
        });

        if (selectedFile) {
          const mediaRef = await saveMediaLocally(milestone.id, selectedFile);
          const current = await db.milestones.get(milestone.id);
          await db.milestones.update(milestone.id, {
            media: [...(current?.media ?? []), mediaRef]
          });
        }
      } else {
        const created = await createMilestone({
          childIds: [childId],
          title: title.trim(),
          description: description.trim() || undefined,
          date,
          category,
          location: location.trim() || undefined
        });

        if (selectedFile) {
          const mediaRef = await saveMediaLocally(created.id, selectedFile);
          await db.milestones.update(created.id, { media: [mediaRef] });
        }
      }

      onClose();
    } catch (err) {
      // בעבר שגיאה כאן נבלעה בשקט - אין יותר try/finally בלי catch.
      console.error('שגיאה בשמירת רגע:', err);
      setError('לא הצלחנו לשמור את הרגע. נסו שוב בעוד רגע.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!milestone) return;
    const confirmed = window.confirm('למחוק את הרגע הזה? הפעולה לא ניתנת לביטול.');
    if (!confirmed) return;

    setIsDeleting(true);
    setError(null);
    try {
      await deleteMilestone(milestone.id);
      onClose();
    } catch (err) {
      console.error('שגיאה במחיקת רגע:', err);
      setError('לא הצלחנו למחוק כרגע. נסו שוב בעוד רגע.');
      setIsDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-ink/40 backdrop-blur-sm sm:items-center sm:justify-center">
      <div className="animate-rise-in max-h-[90vh] w-full overflow-y-auto rounded-t-[2rem] bg-sand-50 p-6 shadow-warm-xl sm:max-w-md sm:rounded-card">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-xl text-ink">{isEditing ? 'עריכת רגע' : 'רגע חדש'}</h2>
          <div className="flex items-center gap-1">
            {isEditing && (
              <button
                onClick={handleDelete}
                disabled={isSaving || isDeleting}
                className="rounded-full p-2 text-clay transition hover:bg-clay/10 disabled:opacity-40"
                aria-label="מחיקת רגע"
                title="מחיקת רגע"
              >
                <Trash2 size={18} />
              </button>
            )}
            <button onClick={onClose} className="rounded-full p-2 text-ink-soft transition hover:bg-sand-200" aria-label="סגירה">
              <X size={20} />
            </button>
          </div>
        </div>

        <label className="mb-1 block text-sm font-medium text-ink-soft">מה קרה?</label>
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder='למשל: "הצעד הראשון!"'
          className="mb-4 w-full rounded-xl border border-sand-300 bg-white px-4 py-3 text-ink placeholder:text-ink-soft/60 transition focus:border-honey focus:outline-none focus:ring-2 focus:ring-honey/20"
        />

        <label className="mb-1 block text-sm font-medium text-ink-soft">תאריך</label>
        <input
          type="date"
          value={date}
          max={new Date().toISOString().slice(0, 10)}
          onChange={(e) => setDate(e.target.value)}
          className="mb-4 w-full rounded-xl border border-sand-300 bg-white px-4 py-3 text-ink transition focus:border-honey focus:outline-none focus:ring-2 focus:ring-honey/20"
        />

        {existingCoverImage?.storageUrl && !selectedFile && (
          <img
            src={existingCoverImage.storageUrl}
            alt=""
            className="mb-3 h-32 w-full rounded-2xl object-cover"
          />
        )}

        <label className="mb-4 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-sand-300 bg-white px-4 py-6 text-ink-soft transition hover:border-honey hover:bg-honey/5">
          <Camera size={20} />
          <span>
            {selectedFile
              ? selectedFile.name
              : existingCoverImage
                ? 'החלפת תמונה או סרטון'
                : 'הוסיפו תמונה או סרטון'}
          </span>
          <input
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
          />
        </label>

        <button
          onClick={() => setShowMore((v) => !v)}
          className="mb-4 flex w-full items-center justify-center gap-1 text-sm font-medium text-honey-dark"
        >
          עוד פרטים (אופציונלי) <ChevronDown size={16} className={`transition-transform ${showMore ? 'rotate-180' : ''}`} />
        </button>

        {showMore && (
          <div className="animate-rise-in mb-4 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-soft">תיאור</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-sand-300 bg-white px-4 py-3 text-ink transition focus:border-honey focus:outline-none focus:ring-2 focus:ring-honey/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-soft">קטגוריה</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as MilestoneCategory)}
                className="w-full rounded-xl border border-sand-300 bg-white px-4 py-3 text-ink transition focus:border-honey focus:outline-none focus:ring-2 focus:ring-honey/20"
              >
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-soft">מיקום</label>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full rounded-xl border border-sand-300 bg-white px-4 py-3 text-ink transition focus:border-honey focus:outline-none focus:ring-2 focus:ring-honey/20"
              />
            </div>
          </div>
        )}

        {error && (
          <p className="mb-3 rounded-xl bg-clay/10 px-4 py-2 text-sm text-clay">{error}</p>
        )}

        <button
          onClick={handleSave}
          disabled={!canSave}
          className="w-full rounded-full bg-honey py-3.5 font-medium text-white shadow-warm transition hover:bg-honey-dark active:scale-[0.98] disabled:opacity-40"
        >
          {isSaving ? 'שומר...' : isEditing ? 'עדכון' : 'שמירה'}
        </button>
        <p className="mt-2 text-center text-xs text-ink-soft">
          הרגע יישמר גם ללא אינטרנט ויסונכרן אוטומטית כשהחיבור יחזור
        </p>
      </div>
    </div>
  );
}
