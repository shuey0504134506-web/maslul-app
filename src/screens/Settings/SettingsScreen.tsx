import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Pencil, LogOut, Cloud, CloudOff, RefreshCw, Download, ChevronDown } from 'lucide-react';
import { db } from '@/db/schema';
import { auth } from '@/services/firebase/config';
import { signOut } from '@/services/auth/authService';
import { syncEngine } from '@/services/sync/syncEngine';
import { calculateCurrentAge } from '@/utils/ageCalculator';
import { useAppStore } from '@/store/useAppStore';
import { useSyncStatusStore } from '@/store/useSyncStatusStore';
import { useChildren } from '@/hooks/useFamilyData';
import { AddChildForm } from '@/screens/Home/AddChildForm';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { Avatar } from '@/components/common/Avatar';
import type { Child } from '@/types';

function timeAgo(timestamp: number): string {
  const seconds = Math.round((Date.now() - timestamp) / 1000);
  if (seconds < 45) return 'ממש עכשיו';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return minutes === 1 ? 'לפני דקה' : `לפני ${minutes} דקות`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return hours === 1 ? 'לפני שעה' : `לפני ${hours} שעות`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'אתמול' : `לפני ${days} ימים`;
}

type Tone = 'ok' | 'wait' | 'bad';

const TONE_STYLE: Record<Tone, { dot: string; text: string }> = {
  ok: { dot: 'bg-sage', text: 'text-sage-dark' },
  wait: { dot: 'bg-honey', text: 'text-honey-dark' },
  bad: { dot: 'bg-clay', text: 'text-clay' }
};

export function SettingsScreen() {
  const [editingChild, setEditingChild] = useState<Child | null>(null);
  const [isAddingChild, setIsAddingChild] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  const children = useChildren();
  const { userId, familyId, isOnline } = useAppStore();
  const { isPulling, lastPullAt, lastPullError, lastReport } = useSyncStatusStore();

  const queue = useLiveQuery(() => db.syncQueue.toArray(), []);
  const localMilestoneCount = useLiveQuery(
    async () => (familyId ? db.milestones.where('familyId').equals(familyId).count() : 0),
    [familyId]
  );

  const user = auth.currentUser;
  const queueLength = queue?.length ?? 0;
  const failing = (queue ?? []).filter((item) => item.lastError);

  const cloudChildren = lastReport?.collections.children?.remote;
  const cloudMilestones = lastReport?.collections.milestones?.remote;
  const rehomed = lastReport
    ? Object.values(lastReport.collections).reduce((sum, c) => sum + c.rehomed, 0)
    : 0;

  let tone: Tone = 'wait';
  let headline = 'מתחבר לענן...';
  if (!isOnline) {
    tone = 'bad';
    headline = 'אין חיבור לאינטרנט';
  } else if (lastPullError || failing.length > 0) {
    tone = 'bad';
    headline = 'יש בעיה בסנכרון עם הענן';
  } else if (queueLength > 0) {
    tone = 'wait';
    headline = `${queueLength} פריטים ממתינים להעלאה`;
  } else if (lastPullAt) {
    tone = 'ok';
    headline = 'הכל מסונכרן';
  }
  const toneStyle = TONE_STYLE[tone];

  async function handleRetry() {
    setIsRetrying(true);
    try {
      await syncEngine.retryAll();
    } finally {
      setIsRetrying(false);
    }
  }

  return (
    <div className="min-h-screen pb-32">
      <ScreenHeader title="הגדרות" />

      <div className="space-y-5 px-5 md:px-8">
        {/* ===== פרטי משתמש ===== */}
        <section className="animate-rise-in rounded-card border border-sand-200/70 bg-white p-5 shadow-warm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-honey/15 font-display text-lg text-honey-dark">
              {(user?.displayName || user?.email || '?').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate font-medium text-ink">{user?.displayName || 'המשתמש שלי'}</p>
              <p className="truncate text-sm text-ink-soft" dir="ltr" style={{ textAlign: 'right' }}>
                {user?.email}
              </p>
            </div>
          </div>
        </section>

        {/* ===== הענן והסנכרון ===== */}
        <section className="animate-rise-in rounded-card border border-sand-200/70 bg-white p-5 shadow-warm" style={{ animationDelay: '60ms' }}>
          <div className="mb-3 flex items-center gap-2.5">
            {isOnline ? <Cloud size={20} className="text-ink-soft" /> : <CloudOff size={20} className="text-clay" />}
            <h2 className="font-display text-lg font-bold text-ink">הענן והסנכרון</h2>
          </div>

          <p className={`mb-3 flex items-center gap-2 text-sm font-medium ${toneStyle.text}`}>
            <span className={`h-2.5 w-2.5 rounded-full ${toneStyle.dot}`} />
            {headline}
            {tone === 'ok' && lastPullAt && (
              <span className="font-normal text-ink-soft">· עודכן {timeAgo(lastPullAt)}</span>
            )}
          </p>

          <dl className="space-y-1.5 rounded-2xl bg-sand-100/70 p-3.5 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-ink-soft">במכשיר</dt>
              <dd className="text-ink">
                {children?.length ?? 0} ילדים · {localMilestoneCount ?? 0} רגעים
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-soft">בענן (בבדיקה האחרונה)</dt>
              <dd className="text-ink">
                {lastReport ? `${cloudChildren ?? 0} ילדים · ${cloudMilestones ?? 0} רגעים` : 'עוד לא נבדק'}
              </dd>
            </div>
            {rehomed > 0 && (
              <div className="flex justify-between gap-3">
                <dt className="text-ink-soft">שוחזרו מנתונים ישנים</dt>
                <dd className="text-sage-dark">{rehomed} רשומות</dd>
              </div>
            )}
          </dl>

          {(lastPullError || failing.length > 0) && (
            <div className="mt-3 rounded-2xl bg-clay/10 p-3.5 text-sm leading-relaxed text-clay">
              {lastPullError && <p>{lastPullError}</p>}
              {failing[0]?.lastError && <p className={lastPullError ? 'mt-2' : ''}>{failing[0].lastError}</p>}
            </div>
          )}

          {lastReport?.legacyError && (
            <p className="mt-3 rounded-2xl bg-honey/10 p-3 text-xs leading-relaxed text-honey-dark">
              לא הצלחנו לבדוק נתונים ישנים: {lastReport.legacyError}
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => void syncEngine.pullFromCloud({ force: true, legacy: true })}
              disabled={isPulling || !isOnline}
              className="flex items-center gap-2 rounded-full bg-honey px-4 py-2.5 text-sm font-medium text-white shadow-warm transition hover:bg-honey-dark active:scale-95 disabled:opacity-50"
            >
              <Download size={16} className={isPulling ? 'animate-bounce' : ''} />
              {isPulling ? 'מושך מהענן...' : 'משוך מהענן עכשיו'}
            </button>

            {queueLength > 0 && (
              <button
                onClick={() => void handleRetry()}
                disabled={isRetrying || !isOnline}
                className="flex items-center gap-2 rounded-full border border-sand-300 bg-white px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-sand-100 active:scale-95 disabled:opacity-50"
              >
                <RefreshCw size={16} className={isRetrying ? 'animate-spin' : ''} />
                נסה להעלות שוב
              </button>
            )}
          </div>

          <details className="group mt-4 text-xs text-ink-soft">
            <summary className="flex cursor-pointer list-none items-center gap-1 font-medium">
              פרטים טכניים
              <ChevronDown size={14} className="transition-transform group-open:rotate-180" />
            </summary>
            <div className="mt-2 space-y-1 break-all rounded-xl bg-sand-100/70 p-3" dir="ltr">
              <p>uid: {userId ?? '-'}</p>
              <p>familyId: {familyId ?? '-'}</p>
            </div>
          </details>
        </section>

        {/* ===== ניהול ילדים ===== */}
        <section className="animate-rise-in" style={{ animationDelay: '120ms' }}>
          <div className="mb-2 flex items-center justify-between px-1">
            <h2 className="font-display text-lg font-bold text-ink">ילדים במסלול</h2>
            <button
              onClick={() => setIsAddingChild(true)}
              className="flex items-center gap-1 rounded-full bg-honey/10 px-3 py-1.5 text-xs font-medium text-honey-dark transition hover:bg-honey/15"
            >
              <Plus size={14} /> הוספת ילד
            </button>
          </div>

          <div className="space-y-2">
            {children?.map((child) => (
              <div
                key={child.id}
                className="flex items-center gap-3 rounded-card border border-sand-200/70 bg-white p-3.5 shadow-warm"
              >
                <Avatar child={child} size={46} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink">{child.name}</p>
                  <p className="text-sm text-ink-soft">{calculateCurrentAge(child.birthDate).label}</p>
                </div>
                <button
                  onClick={() => setEditingChild(child)}
                  className="rounded-full p-2 text-ink-soft transition hover:bg-sand-100"
                  aria-label={`עריכת ${child.name}`}
                  title="עריכה / מחיקה"
                >
                  <Pencil size={18} />
                </button>
              </div>
            ))}

            {children?.length === 0 && (
              <p className="rounded-card border border-dashed border-sand-300 bg-white/60 p-5 text-center text-sm text-ink-soft">
                עוד לא נוסף ילד למסלול
              </p>
            )}
          </div>
        </section>

        {/* ===== יציאה ===== */}
        <section className="animate-rise-in" style={{ animationDelay: '180ms' }}>
          <button
            onClick={() => signOut()}
            className="flex w-full items-center justify-center gap-2 rounded-card border border-sand-200/70 bg-white p-4 text-sm font-medium text-clay shadow-warm transition hover:bg-clay/5"
          >
            <LogOut size={16} /> התנתקות
          </button>
        </section>
      </div>

      {isAddingChild && <AddChildForm onClose={() => setIsAddingChild(false)} />}
      {editingChild && <AddChildForm child={editingChild} onClose={() => setEditingChild(null)} />}
    </div>
  );
}
