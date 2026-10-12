/**
 * לוגיקת מיזוג טהורה (ללא Firebase וללא IndexedDB) - מופרדת בכוונה כדי
 * שאפשר יהיה לבדוק אותה בבדיקות יחידה מהירות.
 */

export type MergeAction = 'add' | 'replace' | 'skip';

/** החלטת מיזוג טהורה (ללא גישה למסד) - נבדקת בנפרד בבדיקות יחידה */
export function decideMerge(
  local: { syncStatus: string; updatedAt: number } | undefined,
  remoteUpdatedAt: number,
  hasQueuedChange: boolean,
  isDeletePending: boolean
): MergeAction {
  if (isDeletePending) return 'skip';
  if (!local) return 'add';
  if (hasQueuedChange || local.syncStatus !== 'synced') return 'skip';
  return remoteUpdatedAt > local.updatedAt ? 'replace' : 'skip';
}

/** מנקה שדות שנכתבו רק לצורך הענן ומסמן את הרשומה כמסונכרנת */
export function normalizeRemoteRecord<T>(raw: Record<string, unknown>): T {
  const record: Record<string, unknown> = { ...raw };
  delete record.updatedAtServer;
  delete record.syncError;
  record.syncStatus = 'synced';
  return record as T;
}

