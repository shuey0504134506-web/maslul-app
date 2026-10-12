import {
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocsFromServer
} from 'firebase/firestore';
import type { Table } from 'dexie';
import { firestore } from '@/services/firebase/config';
import { db } from '@/db/schema';
import type { MediaRef, SyncQueueItem, SyncStatus } from '@/types';
import { v4 as uuid } from 'uuid';
import { decideMerge, normalizeRemoteRecord } from '@/services/data/mergeLogic';

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

// ===========================================================================
// משיכה מהענן (pull)
// ===========================================================================

/**
 * משיכת נתונים מהענן בחזרה למכשיר ("pull").
 *
 * זהו הכיוון המשלים ל-push: הוא רץ אחרי התחברות (או כשחוזר חיבור לרשת) וממלא
 * מחדש את ה-IndexedDB המקומי מ-Firestore, לפי familyId. בלי זה, התקנה חדשה
 * של האפליקציה או כניסה ממכשיר אחר לא הייתה מציגה נתונים שכבר קיימים בענן.
 *
 * כללים חשובים:
 * 1. נתונים נמשכים תמיד מהשרת (getDocsFromServer), לא מה-cache - כך שלעולם לא
 *    נפרש "ענן ריק" כשבעצם פשוט אין רשת.
 * 2. שינוי מקומי שעדיין לא סונכרן (סטטוס שאינו synced, או פריט בתור) לעולם לא נדרס.
 * 3. רשומה שנמחקה במכשיר הזה ומחכה בתור למחיקה בענן לא "קמה לתחייה" מהענן.
 * 4. סטטוס הסנכרון נשמר בענן כפי שהיה ברגע ההעלאה ("pending"/"uploading"),
 *    ולכן בכל משיכה מנרמלים אותו ל-"synced". אחרת רשומות היו נשארות "ממתינות" לנצח.
 * 5. מחיקות: רשומה מקומית שכבר synced ואינה בענן - נמחקת מקומית, אבל לעולם לא
 *    כשהענן החזיר 0 מסמכים (כנראה שגיאה/תקלה, לא "נמחק הכל").
 * 6. שחזור נתונים "יתומים": רשומות שיצר המשתמש עצמו (createdBy) תחת familyId ישן
 *    (למשל משפחה שנוצרה מחדש בעבר) מועברות למשפחה הנוכחית ומסונכרנות מחדש.
 */

type EntityType = SyncQueueItem['entityType'];

interface PullableRecord {
  id: string;
  familyId: string;
  createdBy?: string;
  syncStatus: SyncStatus;
  updatedAt: number;
  media?: MediaRef[];
}

/**
 * קבצי מדיה בענן שאין להם כתובת הורדה (ההעלאה מעולם לא הסתיימה במכשיר המקור)
 * לא ניתנים להצגה במכשיר הזה. משאירים אותם רק אם הקובץ עצמו עדיין שמור כאן
 * והעלאה יכולה להימשך; אחרת מסירים, כדי שלא יוצג "מעלה..." לנצח.
 */
async function sanitizeMedia(media: MediaRef[] | undefined): Promise<MediaRef[] | undefined> {
  if (!Array.isArray(media)) return media;
  const result: MediaRef[] = [];
  for (const m of media) {
    if (m.storageUrl) {
      result.push({ ...m, status: 'synced' });
    } else if (m.localMediaId && (await db.mediaFiles.get(m.localMediaId))) {
      result.push(m);
    }
  }
  return result;
}

async function queueUpdate(entityType: EntityType, entityId: string): Promise<void> {
  await db.syncQueue.add({
    id: uuid(),
    entityType,
    entityId,
    operation: 'update',
    attemptCount: 0,
    createdAt: Date.now()
  });
}

export interface PullCollectionReport {
  remote: number;
  added: number;
  updated: number;
  removed: number;
  rehomed: number;
}

export interface PullReport {
  at: number;
  collections: Record<string, PullCollectionReport>;
  legacyError?: string;
}

async function pullCollection<T extends PullableRecord>(opts: {
  collectionName: string;
  entityType: EntityType;
  table: Table<T, string>;
  familyId: string;
  userId: string | null;
  checkLegacy: boolean;
  queue: SyncQueueItem[];
}): Promise<{ report: PullCollectionReport; legacyError?: string }> {
  const { collectionName, entityType, table, familyId, userId, checkLegacy, queue } = opts;
  const report: PullCollectionReport = { remote: 0, added: 0, updated: 0, removed: 0, rehomed: 0 };

  const queuedForType = queue.filter((q) => q.entityType === entityType);
  const changing = new Set(queuedForType.map((q) => q.entityId));
  const deleting = new Set(queuedForType.filter((q) => q.operation === 'delete').map((q) => q.entityId));

  // --- 1. הנתונים של המשפחה הנוכחית ---
  const snapshot = await getDocsFromServer(
    query(collection(firestore, collectionName), where('familyId', '==', familyId))
  );
  report.remote = snapshot.size;

  const remoteIds = new Set<string>();

  for (const docSnap of snapshot.docs) {
    const raw = docSnap.data() as Record<string, unknown>;
    const id = (raw.id as string | undefined) ?? docSnap.id;
    remoteIds.add(id);

    const local = await table.get(id);
    const action = decideMerge(
      local,
      Number(raw.updatedAt ?? 0),
      changing.has(id),
      deleting.has(id)
    );
    if (action === 'skip') continue;

    const record = normalizeRemoteRecord<T>({ ...raw, id });
    if (Array.isArray(record.media)) {
      record.media = await sanitizeMedia(record.media);
    }
    await table.put(record);
    if (action === 'add') report.added += 1;
    else report.updated += 1;
  }

  // --- 2. מחיקות שנעשו במכשיר/במקום אחר ---
  if (snapshot.size > 0) {
    const localRecords = await table.where('familyId').equals(familyId).toArray();
    for (const localRecord of localRecords) {
      if (
        localRecord.syncStatus === 'synced' &&
        !remoteIds.has(localRecord.id) &&
        !changing.has(localRecord.id)
      ) {
        await table.delete(localRecord.id);
        report.removed += 1;
      }
    }
  }

  // --- 3. שחזור רשומות "יתומות" של המשתמש עצמו, מתחת למשפחה ישנה ---
  let legacyError: string | undefined;
  if (checkLegacy && userId) {
    try {
      const legacy = await getDocsFromServer(
        query(collection(firestore, collectionName), where('createdBy', '==', userId))
      );
      for (const docSnap of legacy.docs) {
        const raw = docSnap.data() as Record<string, unknown>;
        if (raw.familyId === familyId) continue;
        const id = (raw.id as string | undefined) ?? docSnap.id;
        if (deleting.has(id) || (await table.get(id))) continue;

        const record = normalizeRemoteRecord<T>({ ...raw, id });
        record.familyId = familyId;
        record.syncStatus = 'pending';
        record.updatedAt = Date.now();
        if (Array.isArray(record.media)) {
          record.media = await sanitizeMedia(record.media);
        }
        await table.put(record);
        await queueUpdate(entityType, id);
        report.rehomed += 1;
      }
    } catch (err) {
      legacyError = err instanceof Error ? err.message : String(err);
    }
  }

  return { report, legacyError };
}

/** רשומות שנמצאות במכשיר תחת familyId ישן ושייכות למשתמש הנוכחי - מועברות למשפחה הנוכחית */
async function rehomeLocalOrphans(familyId: string, userId: string): Promise<number> {
  let count = 0;
  const targets: Array<{ entityType: EntityType; table: Table<PullableRecord, string> }> = [
    { entityType: 'child', table: db.children as unknown as Table<PullableRecord, string> },
    { entityType: 'milestone', table: db.milestones as unknown as Table<PullableRecord, string> },
    { entityType: 'funnyQuote', table: db.funnyQuotes as unknown as Table<PullableRecord, string> },
    {
      entityType: 'suggestedMilestoneStatus',
      table: db.suggestedMilestoneStatuses as unknown as Table<PullableRecord, string>
    }
  ];

  for (const { entityType, table } of targets) {
    const all = await table.toArray();
    for (const record of all) {
      if (record.familyId !== familyId && record.createdBy === userId) {
        await table.update(record.id, {
          familyId,
          syncStatus: 'pending',
          updatedAt: Date.now()
        } as Partial<PullableRecord>);
        await queueUpdate(entityType, record.id);
        count += 1;
      }
    }
  }
  return count;
}

async function pullAll(
  familyId: string,
  userId: string | null,
  options: { checkLegacy?: boolean } = {}
): Promise<PullReport> {
  const checkLegacy = options.checkLegacy ?? false;

  if (userId) {
    await rehomeLocalOrphans(familyId, userId);
  }

  // תמונת מצב אחת של התור לכל המשיכה - מבטיחה החלטות עקביות בין האוספים
  const queue = await db.syncQueue.toArray();
  const base = { familyId, userId, checkLegacy, queue };

  const results = {
    children: await pullCollection({
      ...base,
      collectionName: 'children',
      entityType: 'child',
      table: db.children
    }),
    milestones: await pullCollection({
      ...base,
      collectionName: 'milestones',
      entityType: 'milestone',
      table: db.milestones
    }),
    funnyQuotes: await pullCollection({
      ...base,
      collectionName: 'funnyQuotes',
      entityType: 'funnyQuote',
      table: db.funnyQuotes
    }),
    suggestedMilestoneStatus: await pullCollection({
      ...base,
      collectionName: 'suggestedMilestoneStatus',
      entityType: 'suggestedMilestoneStatus',
      table: db.suggestedMilestoneStatuses
    })
  };

  const legacyErrors = Object.values(results)
    .map((r) => r.legacyError)
    .filter((e): e is string => !!e);

  return {
    at: Date.now(),
    collections: Object.fromEntries(Object.entries(results).map(([k, v]) => [k, v.report])),
    legacyError: legacyErrors[0]
  };
}

export const remoteData = {
  push,
  pullAll
};
