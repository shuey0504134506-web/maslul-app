import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { firestore } from '@/services/firebase/config';
import { db } from '@/db/schema';
import type { SyncQueueItem } from '@/types';

/**
 * שכבת התקשורת עם Firestore.
 * כל כתיבה ל-Firestore עוברת דרך הקובץ הזה.
 */

const collectionByEntityType: Record<SyncQueueItem['entityType'], string> = {
  child: 'children',
  milestone: 'milestones',
  funnyQuote: 'funnyQuotes',
  suggestedMilestoneStatus: 'suggestedMilestoneStatus'
};

/**
 * Firebase Firestore לא מקבל ערכים מסוג undefined.
 * הפונקציה הזאת מסירה אותם לפני שליחת הנתונים.
 *
 * היא עובדת גם בתוך אובייקטים וגם בתוך מערכים.
 */
function removeUndefined(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => removeUndefined(item));
  }

  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {};

    for (const [key, item] of Object.entries(value)) {
      if (item !== undefined) {
        result[key] = removeUndefined(item);
      }
    }

    return result;
  }

  return value;
}

async function push(item: SyncQueueItem): Promise<void> {
  const collectionName = collectionByEntityType[item.entityType];
  const docRef = doc(firestore, collectionName, item.entityId);

  // מחיקה
  if (item.operation === 'delete') {
    await deleteDoc(docRef);
    return;
  }

  // קבלת הרשומה מ-IndexedDB
  const localRecord = await getLocalRecord(item);

  if (!localRecord) {
    // הרשומה כבר לא קיימת במכשיר.
    return;
  }

  // ניקוי כל ערכי undefined לפני השליחה ל-Firestore.
  const cleanRecord = removeUndefined(localRecord);

  if (
    cleanRecord === null ||
    typeof cleanRecord !== 'object' ||
    Array.isArray(cleanRecord)
  ) {
    throw new Error('הרשומה המקומית אינה תקינה לסנכרון');
  }

  // שמירה ב-Firestore.
  await setDoc(
    docRef,
    {
      ...(cleanRecord as Record<string, unknown>),
      updatedAtServer: serverTimestamp()
    },
    { merge: true }
  );
}

async function getLocalRecord(item: SyncQueueItem) {
  switch (item.entityType) {
    case 'child':
      return db.children.get(item.entityId);

    case 'milestone':
      return db.milestones.get(item.entityId);

    case 'funnyQuote':
      return db.funnyQuotes.get(item.entityId);

    case 'suggestedMilestoneStatus':
      return db.suggestedMilestoneStatuses.get(item.entityId);

    default:
      return undefined;
  }
}

export const remoteData = {
  push
};
