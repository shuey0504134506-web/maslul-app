import { v4 as uuid } from 'uuid';
import { db } from '@/db/schema';
import type { SyncQueueItem } from '@/types';
import { remoteData } from '@/services/data/remoteDataService';
import { uploadPendingMedia } from '@/services/media/mediaService';
import { useAppStore } from '@/store/useAppStore';
import { useSyncStatusStore } from '@/store/useSyncStatusStore';
import { describeError } from '@/utils/firebaseErrors';

/**
 * מנוע הסנכרון.
 *
 * עיקרון העבודה:
 * 1. כל שינוי (יצירה/עריכה/מחיקה) נכתב תחילה ל-IndexedDB ומקבל syncStatus="pending".
 * 2. פריט מתווסף לתור (syncQueue).
 * 3. כשיש רשת - אנחנו מעבדים את התור בסדר, פריט אחרי פריט, עם retry ו-backoff.
 * 4. בהצלחה - הרשומה המקומית מסומנת synced ומקבלת remoteId מפיירסטור.
 * 5. בכישלון - נשאר failed, ננסה שוב אוטומטית וגם ניתן ניסיון חוזר ידני מה-UI.
 *
 * המנוע מאזין לאירועי online/offline של הדפדפן, ורץ גם באתחול האפליקציה
 * (כדי לתפוס פעולות שנוצרו לגמרי אופליין ולא סונכרנו מעולם).
 */

const MAX_RETRY_DELAY_MS = 60_000;
const BASE_RETRY_DELAY_MS = 2_000;

// משיכה מהענן קוראת את כל המסמכים של המשפחה, ולכן מגבילים את תדירותה
// כדי לא לצרוך את מכסת הקריאות החינמית של Firestore.
const PULL_INTERVAL_MS = 5 * 60_000;
const FOREGROUND_PULL_MIN_GAP_MS = 60_000;

const legacyKey = (userId: string, familyId: string) => `maslul:legacy-checked:${userId}:${familyId}`;

function hasCheckedLegacy(userId: string | null, familyId: string): boolean {
  if (!userId) return true;
  try {
    return localStorage.getItem(legacyKey(userId, familyId)) === '1';
  } catch {
    return false;
  }
}

function markLegacyChecked(userId: string | null, familyId: string) {
  if (!userId) return;
  try {
    localStorage.setItem(legacyKey(userId, familyId), '1');
  } catch {
    /* אחסון לא זמין - נבדוק שוב בפעם הבאה, זה לא קריטי */
  }
}

class SyncEngine {
  private isProcessing = false;
  private rerunRequested = false;
  private isPulling = false;
  private lastPullStartedAt = 0;
  private listenersAttached = false;
  private familyId: string | null = null;
  /** שרשרת נעילה: דחיפת התור ומשיכה מהענן לעולם לא רצות במקביל */
  private lock: Promise<unknown> = Promise.resolve();

  private runExclusive<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.lock.then(fn, fn);
    this.lock = run.catch(() => undefined);
    return run;
  }

  /** נקרא פעם אחת בעליית האפליקציה */
  init() {
    if (this.listenersAttached) return;
    this.listenersAttached = true;

    window.addEventListener('online', () => {
      void this.processQueue();
      void this.pullFromCloud({ force: true });
    });
    window.addEventListener('offline', () => {
      // אין צורך לעשות דבר - התור פשוט ימתין. משאירים לתיעוד הכוונה.
    });

    // חזרה לאפליקציה מהרקע (במיוחד בנייד) - דוחפים ומושכים אם עבר מספיק זמן
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible' || !navigator.onLine) return;
      void this.processQueue();
      void this.pullFromCloud({ minGapMs: FOREGROUND_PULL_MIN_GAP_MS });
    });

    // עיבוד ראשוני בעליית האפליקציה - קריטי כדי לתפוס פעולות שנעשו
    // לגמרי אופליין ולא נוסו מעולם, כולל אחרי סגירות והפעלות חוזרות.
    if (navigator.onLine) {
      void this.processQueue();
    }

    // בדיקה תקופתית עדינה (fallback למקרה שאירוע 'online' לא נורה כראוי בדפדפן מסוים).
    // התור נבדק כל 30 שניות; משיכה מהענן - רק כל כמה דקות.
    setInterval(() => {
      if (!navigator.onLine) return;
      void this.processQueue();
      void this.pullFromCloud({ minGapMs: PULL_INTERVAL_MS });
    }, 30_000);
  }

  /**
   * נקרא מ-App.tsx בכל פעם שמזהה המשפחה של המשתמש המחובר ידוע/משתנה.
   * זו הנקודה הקריטית להתקנה חדשה / מכשיר חדש: ברגע שיש familyId, מושכים
   * מיד את כל הנתונים הקיימים מהענן חזרה ל-IndexedDB המקומי.
   */
  setFamilyId(familyId: string | null) {
    const changed = this.familyId !== familyId;
    this.familyId = familyId;
    if (changed && familyId && navigator.onLine) {
      void this.pullFromCloud({ force: true });
    }
  }

  /**
   * משיכה מהענן. כפתור "משוך מהענן עכשיו" במסך ההגדרות קורא לכאן עם force+legacy.
   * legacy = גם חיפוש רשומות ישנות של המשתמש שנשארו תחת מזהה משפחה קודם.
   */
  async pullFromCloud(opts: { force?: boolean; legacy?: boolean; minGapMs?: number } = {}) {
    const familyId = this.familyId;
    const userId = useAppStore.getState().userId;
    if (!familyId || !navigator.onLine || this.isPulling) return;

    const minGap = opts.minGapMs ?? PULL_INTERVAL_MS;
    if (!opts.force && Date.now() - this.lastPullStartedAt < minGap) return;

    this.isPulling = true;
    this.lastPullStartedAt = Date.now();
    const status = useSyncStatusStore.getState().patch;
    status({ isPulling: true });

    try {
      const checkLegacy = opts.legacy ?? !hasCheckedLegacy(userId, familyId);
      const report = await this.runExclusive(() =>
        remoteData.pullAll(familyId, userId, { checkLegacy })
      );
      if (checkLegacy && !report.legacyError) markLegacyChecked(userId, familyId);

      status({ lastPullAt: report.at, lastPullError: null, lastReport: report });
      // רשומות שהועברו/שוחזרו נכנסו לתור - דוחפים אותן עכשיו
      void this.processQueue();
    } catch (err) {
      const { code, message } = describeError(err);
      console.error('שגיאה במשיכת נתונים מהענן:', err);
      status({ lastPullError: code ? `${message} (${code})` : message });
    } finally {
      this.isPulling = false;
      status({ isPulling: false });
    }
  }

  /** מוסיף פעולה לתור הסנכרון - נקרא מכל data service אחרי כתיבה מקומית */
  async enqueue(item: Omit<SyncQueueItem, 'id' | 'attemptCount' | 'createdAt'>) {
    const queueItem: SyncQueueItem = {
      ...item,
      id: uuid(),
      attemptCount: 0,
      createdAt: Date.now()
    };
    await db.syncQueue.add(queueItem);

    if (navigator.onLine) {
      // לא ממתינים - מריצים ברקע כדי לא לחסום את ה-UI
      void this.processQueue();
    }
  }

  async processQueue() {
    // אם כבר רץ עיבוד - מסמנים שצריך סבב נוסף (פריטים שנוספו באמצע לא הולכים לאיבוד)
    if (this.isProcessing) {
      this.rerunRequested = true;
      return;
    }
    this.isProcessing = true;

    try {
      do {
        this.rerunRequested = false;
        await this.runExclusive(() => this.drainQueue());
      } while (this.rerunRequested);
    } finally {
      this.isProcessing = false;
    }
  }

  private async drainQueue() {
    // גם מעלים מדיה ממתינה במקביל לעיבוד התור הטקסטואלי
    void uploadPendingMedia();

    const items = await db.syncQueue.orderBy('createdAt').toArray();

    for (const item of items) {
      if (!navigator.onLine) break; // הרשת נפלה באמצע - עוצרים בעדינות

      const shouldSkip = this.isInBackoffWindow(item);
      if (shouldSkip) continue;

      await this.processItem(item);
    }
  }

  private isInBackoffWindow(item: SyncQueueItem): boolean {
    if (!item.lastAttemptAt || item.attemptCount === 0) return false;
    const delay = Math.min(BASE_RETRY_DELAY_MS * 2 ** item.attemptCount, MAX_RETRY_DELAY_MS);
    return Date.now() - item.lastAttemptAt < delay;
  }

  private async processItem(item: SyncQueueItem) {
    try {
      await this.markEntityStatus(item, 'uploading');
      await remoteData.push(item); // מבצע את הקריאה בפועל לפיירסטור
      await this.markEntityStatus(item, 'synced');
      await db.syncQueue.delete(item.id);
    } catch (err) {
      const { code, message: friendly } = describeError(err);
      const message = code ? `${friendly} (${code})` : friendly || 'שגיאת סנכרון לא ידועה';
      console.error(`שגיאת סנכרון (${item.entityType}):`, err);
      await db.syncQueue.update(item.id, {
        attemptCount: item.attemptCount + 1,
        lastAttemptAt: Date.now(),
        lastError: message
      });
      await this.markEntityStatus(item, 'failed', message);
    }
  }

  private async markEntityStatus(
    item: SyncQueueItem,
    status: 'uploading' | 'synced' | 'failed',
    error?: string
  ) {
    const patch = { syncStatus: status, syncError: error };
    switch (item.entityType) {
      case 'child':
        await db.children.update(item.entityId, patch);
        break;
      case 'milestone':
        await db.milestones.update(item.entityId, patch);
        break;
      case 'funnyQuote':
        await db.funnyQuotes.update(item.entityId, patch);
        break;
      case 'suggestedMilestoneStatus':
        await db.suggestedMilestoneStatuses.update(item.entityId, patch);
        break;
    }
  }

  /** ניסיון חוזר ידני לכל מה שנכשל - מאפס את ה-backoff ומריץ מיד */
  async retryAll() {
    const items = await db.syncQueue.toArray();
    for (const item of items) {
      await db.syncQueue.update(item.id, { lastAttemptAt: undefined, attemptCount: 0 });
    }
    if (navigator.onLine) await this.processQueue();
  }

  /** ניסיון חוזר ידני - נקרא מכפתור "נסה שוב" ב-UI */
  async retry(itemId: string) {
    const item = await db.syncQueue.get(itemId);
    if (!item) return;
    await db.syncQueue.update(itemId, { lastAttemptAt: undefined });
    if (navigator.onLine) void this.processQueue();
  }
}

export const syncEngine = new SyncEngine();
