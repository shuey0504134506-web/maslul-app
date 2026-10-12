import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, ChevronLeft, Settings as SettingsIcon, Heart, Star, Sprout, Camera, Cake, Route, Baby } from 'lucide-react';

import { calculateCurrentAge } from '@/utils/ageCalculator';
import { pickNextSuggestion } from '@/utils/suggestions';
import { resizeImageToDataUrl } from '@/utils/imageResize';
import { formatDate } from '@/utils/format';
import { updateChild } from '@/services/data/localDataService';
import { useSelectedChild, useChildMilestones } from '@/hooks/useFamilyData';
import { QuickAddForm } from '@/screens/MilestoneForm/QuickAddForm';
import { AddChildForm } from '@/screens/Home/AddChildForm';
import { JourneyBackdrop } from '@/components/decor/JourneyBackdrop';
import { Avatar } from '@/components/common/Avatar';
import { ChildSwitcher } from '@/components/common/ChildSwitcher';
import { EmptyState } from '@/components/common/EmptyState';
import { MilestoneList } from '@/components/timeline/MilestoneRow';
import type { Milestone } from '@/types';

/** זיכרון מהעבר: רגע עם תמונה, בחירה יציבה לאורך היום (מועדפים קודם) */
function pickMemory(milestones: Milestone[]): Milestone | undefined {
  const withImage = milestones.filter((m) => m.media.some((x) => x.type === 'image' && x.storageUrl));
  if (withImage.length === 0) return undefined;
  const favorites = withImage.filter((m) => m.isFavorite);
  const pool = favorites.length > 0 ? favorites : withImage;
  const dayNumber = Math.floor(Date.now() / 86_400_000);
  return pool[dayNumber % pool.length];
}

export function HomeScreen() {
  const { children, child, isLoading } = useSelectedChild();
  const milestones = useChildMilestones(child?.id);

  const [isAddChildOpen, setAddChildOpen] = useState(false);
  const [editing, setEditing] = useState<Milestone | null>(null);
  const [quickAdd, setQuickAdd] = useState<{ title?: string } | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const photoInput = useRef<HTMLInputElement>(null);

  const sorted = useMemo(
    () => [...(milestones ?? [])].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt),
    [milestones]
  );

  if (isLoading) return null;

  if (!child) {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-8 text-center">
        <JourneyBackdrop tint="#C99A4B" variant="soft" />
        <div className="relative">
          <EmptyState
            icon={Baby}
            title="ברוכים הבאים למסלול"
            text="כדי להתחיל, הוסיפו פרופיל ילד ראשון. אפשר גם אם הוא כבר בן כמה שנים, ולהשלים זיכרונות ישנים בדיעבד."
            action={
              <button
                onClick={() => setAddChildOpen(true)}
                className="rounded-full bg-honey px-6 py-3 font-medium text-white shadow-warm-lg transition hover:bg-honey-dark active:scale-95"
              >
                הוספת ילד ראשון
              </button>
            }
          />
        </div>
        {isAddChildOpen && <AddChildForm onClose={() => setAddChildOpen(false)} />}
      </div>
    );
  }

  const age = calculateCurrentAge(child.birthDate);
  const ageInMonths = age.years * 12 + age.months;
  const last = sorted[0];
  const next = pickNextSuggestion(
    ageInMonths,
    sorted.map((m) => m.title)
  );
  const memory = pickMemory(sorted);
  const memoryImage = memory?.media.find((m) => m.type === 'image' && m.storageUrl);
  const preview = sorted.slice(0, 4);

  async function handlePhotoPicked(file: File | undefined) {
    if (!file || !child) return;
    setPhotoError(null);
    try {
      const dataUrl = await resizeImageToDataUrl(file);
      await updateChild(child.id, { photoURL: dataUrl });
    } catch (err) {
      console.error('שגיאה בעדכון תמונת הילד:', err);
      setPhotoError('לא הצלחנו לעדכן את התמונה. נסו תמונה אחרת.');
    }
  }

  return (
    <div className="min-h-screen pb-48">
      {/* ===== כותרת איורית: "מסע החיים של ..." ===== */}
      <section className="relative h-60 overflow-hidden bg-gradient-to-b from-[#D5E3E6] via-[#F1EEDD] to-sand-50 md:h-80">
        <JourneyBackdrop tint={child.themeColor} />
        <div className="animate-rise-in relative px-6 pt-8 text-center">
          <h1 className="font-display text-[1.5rem] font-bold leading-tight text-ink">
            מסע החיים של {child.name.split(' ')[0]}
          </h1>
          <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-ink-soft">
            <Heart size={13} className="text-clay" fill="currentColor" />
            כל צעד הוא סיפור
          </p>
        </div>
        <Link
          to="/settings"
          className="absolute right-5 top-6 flex h-10 w-10 items-center justify-center rounded-full bg-white/70 text-ink-soft shadow-warm backdrop-blur transition hover:bg-white"
          aria-label="הגדרות"
        >
          <SettingsIcon size={19} />
        </Link>
      </section>

      {/* ===== גוף המסך: חצי עיגול לבן שעולה על האיור ===== */}
      <div className="relative -mt-12 rounded-t-[2.75rem] bg-sand-50 px-5 pb-2 pt-4 md:px-8">
        {/* פרופיל הילד */}
        <div className="animate-rise-in flex items-center gap-4">
          <div className="relative -mt-14 flex-shrink-0">
            <Avatar child={child} size={112} ring />
            <button
              onClick={() => photoInput.current?.click()}
              className="absolute bottom-1 left-1 flex h-9 w-9 items-center justify-center rounded-full border-2 border-sand-50 bg-ink/85 text-white shadow-warm transition hover:bg-ink active:scale-90"
              aria-label="החלפת תמונת הילד"
              title="החלפת תמונה"
            >
              <Camera size={16} />
            </button>
            <input
              ref={photoInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                void handlePhotoPicked(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </div>

          <div className="min-w-0 flex-1 pt-1">
            <h2 className="truncate font-display text-[2rem] font-bold leading-tight text-ink">{child.name}</h2>
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-ink-soft">
              <Cake size={15} className="flex-shrink-0 text-honey-dark" />
              <span className="truncate">{age.label}</span>
            </p>
          </div>
        </div>

        {photoError && <p className="mt-2 rounded-xl bg-clay/10 px-4 py-2 text-sm text-clay">{photoError}</p>}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <ChildSwitcher children={children} activeId={child.id} />
          <button
            onClick={() => setAddChildOpen(true)}
            className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium text-honey-dark transition hover:bg-honey/10"
          >
            <Plus size={14} /> ילד נוסף
          </button>
        </div>

        {/* הצעד האחרון / הצעד הבא */}
        <div className="animate-rise-in mt-5 grid grid-cols-2 gap-3" style={{ animationDelay: '60ms' }}>
          <button
            onClick={() => (last ? setEditing(last) : setQuickAdd({}))}
            className="flex flex-col rounded-card border border-sage/25 bg-sage/10 p-3.5 text-right transition hover:shadow-warm-lg active:scale-[0.99]"
          >
            <span className="flex items-center gap-2 text-xs font-medium text-sage-dark">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/70">
                <Star size={15} strokeWidth={1.9} />
              </span>
              הצעד האחרון
              <ChevronLeft size={15} className="mr-auto opacity-70" />
            </span>
            <span className="mt-2 line-clamp-2 min-h-[2.6rem] font-display text-base font-medium leading-snug text-ink">
              {last ? last.title : 'עוד לא תועד'}
            </span>
            <span className="mt-1 text-xs text-ink-soft">{last ? formatDate(last.date) : 'הוסיפו את הראשון'}</span>
          </button>

          <button
            onClick={() => setQuickAdd({ title: next?.title })}
            className="flex flex-col rounded-card border border-honey/30 bg-honey/10 p-3.5 text-right transition hover:shadow-warm-lg active:scale-[0.99]"
          >
            <span className="flex items-center gap-2 text-xs font-medium text-honey-dark">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/70">
                <Sprout size={15} strokeWidth={1.9} />
              </span>
              הצעד הבא
              <ChevronLeft size={15} className="mr-auto opacity-70" />
            </span>
            <span className="mt-2 line-clamp-2 min-h-[2.6rem] font-display text-base font-medium leading-snug text-ink">
              {next ? next.title : 'ממשיכים לתעד'}
            </span>
            <span className="mt-1 text-xs text-ink-soft">{next ? next.hint : 'כל רגע שווה'}</span>
          </button>
        </div>

        {/* זיכרון מהעבר */}
        {memory && (
          <button
            onClick={() => setEditing(memory)}
            className="animate-rise-in mt-3 flex w-full items-center gap-4 rounded-card border border-clay/15 bg-gradient-to-l from-clay/10 via-honey/10 to-white p-3.5 text-right shadow-warm transition hover:shadow-warm-lg active:scale-[0.99]"
            style={{ animationDelay: '120ms' }}
          >
            {memoryImage?.storageUrl && (
              <img
                src={memoryImage.storageUrl}
                alt=""
                className="h-[88px] w-[88px] flex-shrink-0 rounded-2xl object-cover shadow-warm"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="font-display text-lg font-bold text-ink">זיכרון מהעבר</p>
              <p className="truncate font-display text-[17px] text-ink">"{memory.title}"</p>
              <p className="mt-0.5 truncate text-[13px] text-ink-soft">
                {memory.ageAtEvent?.[child.id]?.label ? `גיל ${memory.ageAtEvent[child.id].label} • ` : ''}
                {formatDate(memory.date)}
              </p>
            </div>
            <Heart
              size={22}
              className="flex-shrink-0 self-start text-clay"
              fill={memory.isFavorite ? 'currentColor' : 'none'}
              strokeWidth={1.8}
            />
          </button>
        )}

        {/* המסלול */}
        <div className="mb-3 mt-7 flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-display text-xl font-bold text-ink">
            <Route size={20} className="text-honey-dark" />
            המסלול של {child.name.split(' ')[0]}
          </h3>
          {sorted.length > 0 && (
            <Link to="/timeline" className="flex items-center gap-0.5 text-sm font-medium text-sage-dark hover:underline">
              הצג הכל <ChevronLeft size={15} />
            </Link>
          )}
        </div>

        {preview.length > 0 ? (
          <MilestoneList milestones={preview} childId={child.id} themeColor={child.themeColor} onOpen={setEditing} />
        ) : (
          <EmptyState
            icon={Route}
            title="המסלול עוד ריק"
            text="כל תחנה כאן היא רגע שתבחרו לשמר. אפשר להתחיל מהיום, או להוסיף זיכרון ישן."
            action={
              <button
                onClick={() => setQuickAdd({})}
                className="rounded-full bg-honey px-6 py-2.5 text-sm font-medium text-white shadow-warm transition hover:bg-honey-dark active:scale-95"
              >
                הוספת הרגע הראשון
              </button>
            }
          />
        )}
      </div>

      {quickAdd && <QuickAddForm childId={child.id} initialTitle={quickAdd.title} onClose={() => setQuickAdd(null)} />}
      {editing && <QuickAddForm childId={child.id} milestone={editing} onClose={() => setEditing(null)} />}
      {isAddChildOpen && <AddChildForm onClose={() => setAddChildOpen(false)} />}
    </div>
  );
}
