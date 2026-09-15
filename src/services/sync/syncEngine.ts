import { v4 as uuid } from 'uuid';
import { db } from '@/db/schema';
import type { SyncQueueItem } from '@/types';
import { remoteData } from '@/services/data/remoteDataService';
import { uploadPendingMedia } from '@/services/media/mediaService';

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

class SyncEngine {
  private isProcessing = false;
  private listenersAttached = false;
  private familyId: string | null = null;

  /** נקרא פעם אחת בעליית האפליקציה */
  init() {
    if (this.listenersAttached) return;
    this.listenersAttached = true;

    window.addEventListener('online', () => {
      this.processQueue();
      void this.pullFromCloud();
    });
    window.addEventListener('offline', () => {
      // אין צורך לעשות דבר - התור פשוט ימתין. משאירים לתיעוד הכוונה.
    });

    // עיבוד ראשוני בעליית האפליקציה - קריטי כדי לתפוס פעולות שנעשו
    // לגמרי אופליין ולא נוסו מעולם, כולל אחרי סגירות והפעלות חוזרות.
    if (navigator.onLine) {
      this.processQueue();
      void this.pullFromCloud();
    }

    // בדיקה תקופתית עדינה (fallback למקרה שאירוע 'online' לא נורה כראוי בדפדפן מסוים)
    setInterval(() => {
      if (navigator.onLine) {
        this.processQueue();
        void this.pullFromCloud();
      }
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
      void this.pullFromCloud();
    }
  }

  private async pullFromCloud() {
    if (!this.familyId || !navigator.onLine) return;
    try {
      await remoteData.pullAll(this.familyId);
    } catch (err) {
      // כשלון משיכה (למשל רשת לא יציבה) - לא מפילים את האפליקציה,
      // הניסיון הבא (אירוע online הבא, או הבדיקה התקופתית) ינסה שוב.
      console.error('שגיאה במשיכת נתונים מהענן:', err);
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
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      // גם מעלים מדיה ממתינה במקביל לעיבוד התור הטקסטואלי
      void uploadPendingMedia();

      const items = await db.syncQueue.orderBy('createdAt').toArray();

      for (const item of items) {
        if (!navigator.onLine) break; // הרשת נפלה באמצע - עוצרים בעדינות

        const shouldSkip = this.isInBackoffWindow(item);
        if (shouldSkip) continue;

        await this.processItem(item);
      }
    } finally {
      this.isProcessing = false;
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
      const message = err instanceof Error ? err.message : 'שגיאת סנכרון לא ידועה';
      console.error(`שגיאת סנכרון (${item.entityType}):`, message);
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

  /** ניסיון חוזר ידני - נקרא מכפתור "נסה שוב" ב-UI */
  async retry(itemId: string) {
    const item = await db.syncQueue.get(itemId);
    if (!item) return;
    await db.syncQueue.update(itemId, { lastAttemptAt: undefined });
    if (navigator.onLine) void this.processQueue();
  }
}

export const syncEngine = new SyncEngine();
