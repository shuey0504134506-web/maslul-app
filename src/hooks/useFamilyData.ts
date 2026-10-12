import { useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { useAppStore } from '@/store/useAppStore';

/**
 * שליפות נתונים משותפות לכל המסכים.
 *
 * שני תיקונים חשובים לעומת השליפה הישירה שהייתה בכל מסך:
 * 1. מסננים לפי familyId של המשתמש המחובר - כך שנתונים של משתמש אחר שהתחבר
 *    באותו מכשיר לא מתערבבים בתצוגה.
 * 2. הילד הנבחר נקבע במקום אחד. בעבר רק מסך הבית "בחר" ילד בלי לשמור את הבחירה,
 *    ולכן אחרי פתיחה מחדש של האפליקציה מסכי המסלול/גלריה/חיפוש הציגו "לא נבחר ילד".
 */
export function useChildren() {
  const familyId = useAppStore((s) => s.familyId);
  return useLiveQuery(async () => {
    if (!familyId) return [];
    const all = await db.children.where('familyId').equals(familyId).toArray();
    return all.sort((a, b) => a.createdAt - b.createdAt);
  }, [familyId]);
}

export function useSelectedChild() {
  const children = useChildren();
  const selectedChildId = useAppStore((s) => s.selectedChildId);
  const setSelectedChildId = useAppStore((s) => s.setSelectedChildId);

  const child = children?.find((c) => c.id === selectedChildId) ?? children?.[0];

  useEffect(() => {
    if (child && child.id !== selectedChildId) setSelectedChildId(child.id);
  }, [child, selectedChildId, setSelectedChildId]);

  return { children, child, isLoading: children === undefined };
}

export function useChildMilestones(childId: string | undefined) {
  return useLiveQuery(async () => {
    if (!childId) return [];
    return db.milestones.where('childIds').equals(childId).toArray();
  }, [childId]);
}
