import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { firestore } from '@/services/firebase/config';
import { db } from '@/db/schema';
import type { SyncQueueItem } from '@/types';

/**
 * שכבת התקשורת האמיתית עם Firestore.
 * זו נקודת המגע היחידה עם הרשת מלבד mediaService - נקראת אך ורק
 * על ידי syncEngine, אף פעם לא ישירות מ-UI. כך אם בעתיד נחליף backend,
 * צריך לשנות רק כאן.
 */

const collectionByEntityType: Record<SyncQueueItem['entityType'], string> = {
  child: 'children',
  milestone: 'milestones',
  funnyQuote: 'funnyQuotes',
  suggestedMilestoneStatus: 'suggestedMilestoneStatus'
};

async function push(item: SyncQueueItem): Promise<void> {
  const collectionName = collectionByEntityType[item.entityType];
  const docRef = doc(firestore, collectionName, item.entityId);

  if (item.operation === 'delete') {
    await deleteDoc(docRef);
    return;
  }

  const localRecord = await getLocalRecord(item);
  if (!localRecord) {
    // הרשומה נמחקה מקומית לפני שהספקנו לסנכרן את היצירה - אין מה לדחוף
    return;
  }

  // אין קבצי מדיה כאן - רק metadata טקסטואלי. storagePath/storageUrl כבר
  // חלק מהאובייקט לאחר שה-mediaService עדכן אותם בהעלאה מוצלחת.
  await setDoc(
    docRef,
    { ...localRecord, updatedAtServer: serverTimestamp() },
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
  }
}

export const remoteData = { push };
