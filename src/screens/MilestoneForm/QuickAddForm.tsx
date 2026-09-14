import { useState } from 'react';
import { X, Camera, ChevronDown } from 'lucide-react';
import { createMilestone } from '@/services/data/localDataService';
import { saveMediaLocally } from '@/services/media/mediaService';
import { db } from '@/db/schema';
import type { MilestoneCategory } from '@/types';

/**
 * טופס ההוספה המהירה.
 * ברירת המחדל: בחירת ילד (כבר נבחר מראש) → כותרת → תמונה → שמירה.
 * כל שאר השדות (מיקום, אנשים, קטגוריה, הערה) מקופלים תחת "עוד פרטים",
 * כפי שהתבקש - הורה לא אמור למלא טופס של 20 שדות כדי לשמור רגע.
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

export function QuickAddForm({ childId, onClose }: { childId: string; onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showMore, setShowMore] = useState(false);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<MilestoneCategory>('special');
  const [location, setLocation] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const canSave = title.trim().length > 0 && !isSaving;

  async function handleSave() {
    if (!canSave) return;
    setIsSaving(true);
    try {
      const milestone = await createMilestone({
        childIds: [childId],
        title: title.trim(),
        description: description.trim() || undefined,
        date,
        category,
        location: location.trim() || undefined
      });

      if (selectedFile) {
        const mediaRef = await saveMediaLocally(milestone.id, selectedFile);
        await db.milestones.update(milestone.id, { media: [mediaRef] });
      }

      onClose();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-ink/40 backdrop-blur-sm sm:items-center sm:justify-center">
      <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-[2rem] bg-sand-50 p-6 sm:max-w-md sm:rounded-soft">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl text-ink">רגע חדש</h2>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-sand-200" aria-label="סגירה">
            <X size={20} />
          </button>
        </div>

        <label className="mb-1 block text-sm font-medium text-ink-soft">מה קרה?</label>
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder='למשל: "הצעד הראשון!"'
          className="mb-4 w-full rounded-xl border border-sand-300 bg-white px-4 py-3 text-ink placeholder:text-ink-soft/60 focus:border-honey"
        />

        <label className="mb-1 block text-sm font-medium text-ink-soft">תאריך</label>
        <input
          type="date"
          value={date}
          max={new Date().toISOString().slice(0, 10)}
          onChange={(e) => setDate(e.target.value)}
          className="mb-4 w-full rounded-xl border border-sand-300 bg-white px-4 py-3 text-ink focus:border-honey"
        />

        <label className="mb-4 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-sand-300 bg-white px-4 py-6 text-ink-soft hover:border-honey">
          <Camera size={20} />
          <span>{selectedFile ? selectedFile.name : 'הוסיפו תמונה או סרטון'}</span>
          <input
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
          />
        </label>

        <button
          onClick={() => setShowMore((v) => !v)}
          className="mb-4 flex w-full items-center justify-center gap-1 text-sm text-honey-dark"
        >
          עוד פרטים (אופציונלי) <ChevronDown size={16} className={showMore ? 'rotate-180' : ''} />
        </button>

        {showMore && (
          <div className="mb-4 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-soft">תיאור</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-sand-300 bg-white px-4 py-3 text-ink focus:border-honey"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-soft">קטגוריה</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as MilestoneCategory)}
                className="w-full rounded-xl border border-sand-300 bg-white px-4 py-3 text-ink focus:border-honey"
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
                className="w-full rounded-xl border border-sand-300 bg-white px-4 py-3 text-ink focus:border-honey"
              />
            </div>
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={!canSave}
          className="w-full rounded-full bg-honey py-3.5 font-medium text-white transition hover:bg-honey-dark disabled:opacity-40"
        >
          {isSaving ? 'שומר...' : 'שמירה'}
        </button>
        <p className="mt-2 text-center text-xs text-ink-soft">
          הרגע יישמר גם ללא אינטרנט ויסונכרן אוטומטית כשהחיבור יחזור
        </p>
      </div>
    </div>
  );
}
