import { doc, setDoc, deleteDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import type { Table } from 'dexie';
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

/**
 * משיכת נתונים מהענן בחזרה למכשיר ("pull").
 *
 * זהו הכיוון המשלים ל-push: הוא רץ אחרי התחברות (או כשחוזר חיבור לרשת) וממלא
 * מחדש את ה-IndexedDB המקומי מ-Firestore, לפי familyId. בלי זה, התקנה חדשה
 * של האפליקציה או כניסה ממכשיר אחר לא הייתה מציגה נתונים שכבר קיימים בענן.
 *
 * כלל ההתנגשות: אם יש למכשיר הזה שינוי מקומי שעדיין לא סונכרן (syncStatus
 * שונה מ-"synced") - הגרסה המקומית מנצחת ולא נדרסת, עד שהיא עצמה תסונכרן.
 * אחרת, גרסת הענן מוחלת רק אם היא עדכנית יותר (updatedAt גבוה יותר),
 * כדי לתמוך גם בעריכות שנעשו ממכשיר אחר של אותה משפחה.
 *
 * מחיקות: כל רשומה מקומית שכבר "synced" ולא מופיעה יותר בין המסמכים שחזרו
 * מהשאילתה (כלומר נמחקה בענן, בין אם דרך האפליקציה ובין אם ישירות ב-Firebase
 * console) - נמחקת גם מקומית. רשומות "pending"/"failed"/"uploading" לא נגענות,
 * כדי לא למחוק בטעות שינוי מקומי חדש שעדיין לא הספיק להעלות.
 */
async function pullCollection<
  T extends { id: string; familyId: string; syncStatus: string; updatedAt: number }
>(collectionName: string, table: Table<T, string>, familyId: string): Promise<void> {
  const q = query(collection(firestore, collectionName), where('familyId', '==', familyId));
  const snapshot = await getDocs(q);

  const remoteIds = new Set<string>();

  for (const docSnap of snapshot.docs) {
    const remote = docSnap.data() as T;
    remoteIds.add(remote.id);
    const local = await table.get(remote.id);

    if (!local) {
      await table.add(remote);
      continue;
    }

    if (local.syncStatus !== 'synced') {
      // יש שינוי מקומי שממתין להעלאה - לא דורסים אותו.
      continue;
    }

    if (remote.updatedAt > local.updatedAt) {
      await table.put(remote);
    }
  }

  // מחיקת רשומות מקומיות שסונכרנו בעבר אבל כבר לא קיימות בענן (נמחקו)
  const localRecords = await table.where('familyId').equals(familyId).toArray();
  for (const localRecord of localRecords) {
    if (localRecord.syncStatus === 'synced' && !remoteIds.has(localRecord.id)) {
      await table.delete(localRecord.id);
    }
  }
}

async function pullAll(familyId: string): Promise<void> {
  await pullCollection('children', db.children, familyId);
  await pullCollection('milestones', db.milestones, familyId);
  await pullCollection('funnyQuotes', db.funnyQuotes, familyId);
  await pullCollection('suggestedMilestoneStatus', db.suggestedMilestoneStatuses, familyId);
}

export const remoteData = {
  push,
  pullAll
};
