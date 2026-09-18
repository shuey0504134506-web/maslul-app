import { v4 as uuid } from 'uuid';
import { db } from '@/db/schema';
import { syncEngine } from '@/services/sync/syncEngine';
import { calculateAgeAtDate } from '@/utils/ageCalculator';
import { useAppStore } from '@/store/useAppStore';
import type { Child, Milestone, MilestoneCategory } from '@/types';

/**
 * זוהי נקודת הכניסה היחידה לכתיבת נתונים באפליקציה.
 * שום מסך לא כותב ישירות ל-IndexedDB או לפיירסטור - הכל עובר דרך כאן,
 * כדי לשמור על העיקרון: כתיבה מקומית מיידית + תור סנכרון, תמיד באותו סדר.
 */

function currentIdentity() {
  const { userId, familyId } = useAppStore.getState();
  if (!userId || !familyId) {
    // לא אמור לקרות כי המסכים מוגנים ע"י שער האימות ב-App.tsx, אך זו רשת ביטחון
    throw new Error('לא ניתן ליצור רשומה: המשתמש אינו מחובר או שרשומת המשפחה טרם נטענה');
  }
  return { userId, familyId };
}

function nowStamp() {
  return Date.now();
}

export async function createChild(input: {
  name: string;
  birthDate: string;
  gender?: Child['gender'];
  themeColor: string;
}): Promise<Child> {
  const { userId, familyId } = currentIdentity();
  const id = uuid();
  const child: Child = {
    id,
    clientGeneratedId: id,
    familyId,
    name: input.name,
    birthDate: input.birthDate,
    gender: input.gender,
    themeColor: input.themeColor,
    syncStatus: 'pending',
    createdAt: nowStamp(),
    updatedAt: nowStamp(),
    createdBy: userId,
    updatedBy: userId
  };

  await db.children.add(child);
  await syncEngine.enqueue({ entityType: 'child', entityId: id, operation: 'create' });
  return child;
}

export async function updateChild(
  id: string,
  patch: Partial<Pick<Child, 'name' | 'birthDate' | 'gender' | 'themeColor'>>
): Promise<void> {
  const { userId } = currentIdentity();
  await db.children.update(id, {
    ...patch,
    updatedAt: nowStamp(),
    updatedBy: userId,
    syncStatus: 'pending'
  });
  await syncEngine.enqueue({ entityType: 'child', entityId: id, operation: 'update' });
}

export async function deleteChild(id: string): Promise<void> {
  // מחיקת ילד: מוחקים גם כל ציון דרך שמשויך *רק* אליו, ומסירים אותו
  // מציוני דרך משותפים עם ילדים נוספים (במקום להשאיר הפניה לילד שנמחק).
  const relatedMilestones = await db.milestones.where('childIds').equals(id).toArray();

  for (const milestone of relatedMilestones) {
    const remainingChildIds = milestone.childIds.filter((childId) => childId !== id);
    if (remainingChildIds.length === 0) {
      await deleteMilestone(milestone.id);
    } else {
      const ageAtEvent = { ...milestone.ageAtEvent };
      delete ageAtEvent[id];
      await updateMilestone(milestone.id, { childIds: remainingChildIds, ageAtEvent });
    }
  }

  await syncEngine.enqueue({ entityType: 'child', entityId: id, operation: 'delete' });
  await db.children.delete(id);
}

export async function createMilestone(input: {
  childIds: string[];
  title: string;
  description?: string;
  parentNote?: string;
  date: string;
  time?: string;
  category: MilestoneCategory;
  location?: string;
  peoplePresent?: string[];
  isFavorite?: boolean;
}): Promise<Milestone> {
  const { userId, familyId } = currentIdentity();
  const id = uuid();

  // חישוב גיל אוטומטי לכל ילד משויך, לפי תאריך האירוע (לא התאריך הנוכחי) -
  // כך שגם זיכרונות שמוזנים בדיעבד מקבלים גיל נכון.
  const ageAtEvent: Milestone['ageAtEvent'] = {};
  for (const childId of input.childIds) {
    const child = await db.children.get(childId);
    if (child) {
      ageAtEvent[childId] = calculateAgeAtDate(child.birthDate, input.date);
    }
  }

  const milestone: Milestone = {
    id,
    clientGeneratedId: id,
    familyId,
    childIds: input.childIds,
    title: input.title,
    description: input.description,
    parentNote: input.parentNote,
    date: input.date,
    time: input.time,
    ageAtEvent,
    category: input.category,
    location: input.location,
    peoplePresent: input.peoplePresent,
    isFavorite: input.isFavorite ?? false,
    media: [],
    syncStatus: 'pending',
    createdAt: nowStamp(),
    updatedAt: nowStamp(),
    createdBy: userId,
    updatedBy: userId
  };

  await db.milestones.add(milestone);
  await syncEngine.enqueue({ entityType: 'milestone', entityId: id, operation: 'create' });
  return milestone;
}

export async function updateMilestone(id: string, patch: Partial<Milestone>): Promise<void> {
  const { userId } = currentIdentity();
  await db.milestones.update(id, {
    ...patch,
    updatedAt: nowStamp(),
    updatedBy: userId,
    syncStatus: 'pending'
  });
  await syncEngine.enqueue({ entityType: 'milestone', entityId: id, operation: 'update' });
}

export async function deleteMilestone(id: string): Promise<void> {
  // מחיקה רכה: מסמנים pending-delete בתור, ומוחקים מקומית רק אחרי אישור סנכרון,
  // כדי לא לאבד מידע אם המחיקה לא תושלם (למשל המכשיר נסגר באמצע).
  await syncEngine.enqueue({ entityType: 'milestone', entityId: id, operation: 'delete' });
  await db.milestones.delete(id);
}

export async function toggleFavorite(id: string, isFavorite: boolean): Promise<void> {
  await updateMilestone(id, { isFavorite });
}
