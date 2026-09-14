import Dexie, { type Table } from 'dexie';
import type {
  Child,
  Milestone,
  FunnyQuote,
  SuggestedMilestoneStatus,
  LocalMediaFile,
  SyncQueueItem
} from '@/types';

/**
 * זהו "מקור האמת" המקומי של האפליקציה. ה-UI קורא תמיד מכאן (דרך useLiveQuery),
 * ולא מ-Firestore ישירות. כך המסך תמיד מגיב מיידית, גם ללא רשת.
 *
 * חשוב: אין כאן Base64 - שדה `blob` ב-mediaFiles מאחסן קובץ בינארי אמיתי,
 * ש-IndexedDB תומך בו באופן טבעי וזה מונע ניפוח קיצוני של גודל האחסון.
 */
export class MaslulDatabase extends Dexie {
  children!: Table<Child, string>;
  milestones!: Table<Milestone, string>;
  funnyQuotes!: Table<FunnyQuote, string>;
  suggestedMilestoneStatuses!: Table<SuggestedMilestoneStatus, string>;
  mediaFiles!: Table<LocalMediaFile, string>;
  syncQueue!: Table<SyncQueueItem, string>;

  constructor() {
    super('maslul-db');

    this.version(1).stores({
      // המפתח הראשי הוא id (=clientGeneratedId). אינדקסים נוספים לפי שדות חיפוש/מיון נפוצים.
      children: 'id, familyId, syncStatus, birthDate',
      milestones: 'id, familyId, syncStatus, date, category, *childIds, isFavorite',
      funnyQuotes: 'id, familyId, syncStatus, date, childId',
      suggestedMilestoneStatuses: 'id, familyId, childId, suggestionKey',
      mediaFiles: 'id, milestoneId, status',
      syncQueue: 'id, entityType, entityId, createdAt'
    });
  }
}

export const db = new MaslulDatabase();
