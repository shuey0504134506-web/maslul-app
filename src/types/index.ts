/**
 * טיפוסי הליבה של האפליקציה.
 * שדות הסנכרון (clientGeneratedId / syncStatus / createdAt / updatedAt) מופיעים
 * בכל ישות שמסונכרנת עם Firestore, כדי לתמוך במזהים יציבים ובפתרון קונפליקטים עתידי.
 */

export type SyncStatus = 'pending' | 'uploading' | 'synced' | 'failed';

/** שדות בסיס שכל רשומה מסונכרנת חייבת לכלול */
export interface Syncable {
  clientGeneratedId: string; // UUID שנוצר במכשיר - מונע כפילויות בסנכרון חוזר
  syncStatus: SyncStatus;
  createdAt: number; // epoch millis
  updatedAt: number;
  createdBy: string; // userId
  updatedBy: string;
  familyId: string;
  /** נמלא רק לאחר סנכרון מוצלח - מזהה המסמך בפיירסטור */
  remoteId?: string;
  syncError?: string;
}

export type Gender = 'boy' | 'girl' | 'other' | undefined;

export interface Child extends Syncable {
  id: string; // = clientGeneratedId, שדה נוח לאינדוקס
  name: string;
  photoLocalRef?: string; // מצביע לרשומת mediaFiles כל עוד לא הועלה
  photoURL?: string; // לאחר העלאה
  birthDate: string; // ISO date (YYYY-MM-DD)
  gender?: Gender;
  themeColor: string; // hex, נבחר על ידי ההורה
  isArchived?: boolean;
}

export type MilestoneCategory =
  | 'motor' // התפתחות מוטורית
  | 'language' // שפה
  | 'social' // חברה ורגש
  | 'education' // לימודים
  | 'health' // בריאות וגדילה
  | 'family' // משפחה
  | 'holidays' // חגים
  | 'trips' // טיולים
  | 'achievements' // הישגים
  | 'funny' // דברים מצחיקים
  | 'special'; // ציוני דרך מיוחדים

export interface AgeAtEvent {
  years: number;
  months: number;
  days: number;
  /** מחרוזת מוכנה להצגה, למשל "שנה, 3 חודשים ו-12 ימים" */
  label: string;
}

export interface MediaRef {
  id: string;
  type: 'image' | 'video' | 'audio';
  /** נתיב ב-Firebase Storage, קיים רק לאחר העלאה מוצלחת */
  storagePath?: string;
  storageUrl?: string;
  /** מזהה הרשומה המקומית בטבלת mediaFiles (Blob) */
  localMediaId?: string;
  status: SyncStatus;
}

export interface Milestone extends Syncable {
  id: string;
  childIds: string[]; // תומך באירוע המשויך למספר ילדים
  title: string;
  description?: string;
  parentNote?: string;
  date: string; // ISO date
  time?: string; // HH:mm
  ageAtEvent: Record<string, AgeAtEvent>; // ageAtEvent[childId]
  category: MilestoneCategory;
  location?: string;
  peoplePresent?: string[];
  isFavorite: boolean;
  media: MediaRef[];
}

export interface FunnyQuote extends Syncable {
  id: string;
  childId: string;
  quote: string;
  date: string;
  ageAtEvent: AgeAtEvent;
  story?: string;
  media: MediaRef[];
}

export type SuggestedMilestoneAnswer = 'happened' | 'not-yet' | 'skipped' | 'not-relevant';

export interface SuggestedMilestoneStatus extends Syncable {
  id: string;
  childId: string;
  suggestionKey: string;
  status: SuggestedMilestoneAnswer;
  linkedMilestoneId?: string; // אם "התרחש" ונוצר ציון דרך מקושר
}

/** רשומת קובץ מדיה גולמי שנשמר מקומית - זו "רשת הביטחון" שמונעת אובדן מדיה offline */
export interface LocalMediaFile {
  id: string; // = MediaRef.localMediaId
  milestoneId: string; // או funnyQuoteId
  blob: Blob;
  mimeType: string;
  sizeBytes: number;
  createdAt: number;
  status: 'pending' | 'uploading' | 'uploaded' | 'failed';
  uploadedAt?: number;
  retryCount: number;
  lastError?: string;
}

/** פריט בתור הסנכרון - כל פעולת כתיבה שממתינה לדחיפה ל-Firestore */
export interface SyncQueueItem {
  id: string; // uuid
  entityType: 'child' | 'milestone' | 'funnyQuote' | 'suggestedMilestoneStatus';
  entityId: string; // clientGeneratedId של הישות
  operation: 'create' | 'update' | 'delete';
  attemptCount: number;
  lastAttemptAt?: number;
  lastError?: string;
  createdAt: number;
}
