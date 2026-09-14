import { v4 as uuid } from 'uuid';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db } from '@/db/schema';
import { storage } from '@/services/firebase/config';
import { useAppStore } from '@/store/useAppStore';
import type { LocalMediaFile, MediaRef } from '@/types';

/**
 * שירות המדיה.
 *
 * עיקרון: קובץ מדיה (Blob) נשמר תמיד קודם כל ב-IndexedDB (טבלת mediaFiles) -
 * לא רק כ-object URL זמני בזיכרון RAM, כי זה נעלם ברגע שהטאב נסגר.
 * רק לאחר שנשמר מקומית בהצלחה, מתחילה העלאה הדרגתית לפיירבייס סטורג'.
 *
 * שימוש ב-uploadBytesResumable מה-SDK של פיירבייס: זו יכולת מובנית שתומכת
 * בהמשכיות ברמת ה-session אם החיבור מתנתק לרגע באמצע העלאת קובץ גדול,
 * בלי שצריך לממש פרוטוקול chunking מאפס.
 */

const CLEANUP_GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000; // 7 ימים, לפי מדיניות ברירת המחדל

/** נקרא מיד כשמשתמש בוחר/מצלם קובץ - גם לגמרי אופליין */
export async function saveMediaLocally(
  milestoneId: string,
  file: File
): Promise<MediaRef> {
  const localId = uuid();

  const localRecord: LocalMediaFile = {
    id: localId,
    milestoneId,
    blob: file, // File הוא תת-מחלקה של Blob - נשמר במלואו ב-IndexedDB
    mimeType: file.type,
    sizeBytes: file.size,
    createdAt: Date.now(),
    status: 'pending',
    retryCount: 0
  };

  await db.mediaFiles.add(localRecord);

  const mediaType = file.type.startsWith('video')
    ? 'video'
    : file.type.startsWith('audio')
      ? 'audio'
      : 'image';

  // מנסים העלאה מיידית אם יש רשת, אבל לא חוסמים - ה-UI ממשיך מיד
  if (navigator.onLine) {
    void uploadSingleFile(localId);
  }

  return {
    id: localId,
    type: mediaType,
    localMediaId: localId,
    status: 'pending'
  };
}

/** נקרא בעליית האפליקציה ובכל חזרה לרשת - ממשיך העלאות שנעצרו באמצע */
export async function uploadPendingMedia() {
  if (!navigator.onLine) return;

  const pending = await db.mediaFiles
    .where('status')
    .anyOf('pending', 'failed')
    .toArray();

  for (const item of pending) {
    if (!navigator.onLine) break;
    await uploadSingleFile(item.id);
  }

  await cleanupOldUploadedFiles();
}

async function uploadSingleFile(localId: string) {
  const record = await db.mediaFiles.get(localId);
  if (!record) return;

  try {
    await db.mediaFiles.update(localId, { status: 'uploading' });

    const extension = guessExtension(record.mimeType);
    const familyId = useAppStore.getState().familyId ?? 'unknown-family';
    const storagePath = `families/${familyId}/milestones/${record.milestoneId}/${localId}.${extension}`;
    const storageRef = ref(storage, storagePath);

    await new Promise<void>((resolve, reject) => {
      const task = uploadBytesResumable(storageRef, record.blob, {
        contentType: record.mimeType
      });
      task.on(
        'state_changed',
        undefined,
        (error) => reject(error),
        () => resolve()
      );
    });

    const downloadUrl = await getDownloadURL(storageRef);

    await db.mediaFiles.update(localId, {
      status: 'uploaded',
      uploadedAt: Date.now()
    });

    await patchMilestoneMediaRef(record.milestoneId, localId, storagePath, downloadUrl);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'שגיאת העלאת מדיה';
    await db.mediaFiles.update(localId, {
      status: 'failed',
      retryCount: (record.retryCount ?? 0) + 1,
      lastError: message
    });
    // חשוב: הקובץ המקומי *לא* נמחק בכישלון - הוא ינסה שוב באתחול/סנכרון הבא
  }
}

async function patchMilestoneMediaRef(
  milestoneId: string,
  localMediaId: string,
  storagePath: string,
  storageUrl: string
) {
  const milestone = await db.milestones.get(milestoneId);
  if (!milestone) return;

  const updatedMedia = milestone.media.map((m) =>
    m.localMediaId === localMediaId
      ? { ...m, storagePath, storageUrl, status: 'synced' as const }
      : m
  );

  await db.milestones.update(milestoneId, { media: updatedMedia });
}

/**
 * ניקוי קבצים מקומיים שכבר הועלו בהצלחה, אחרי תקופת חסד.
 * לא מוחקים מיד כדי שתהיה רשת ביטחון למקרה של תקלה בצד השרת.
 */
async function cleanupOldUploadedFiles() {
  const cutoff = Date.now() - CLEANUP_GRACE_PERIOD_MS;
  const uploaded = await db.mediaFiles
    .where('status')
    .equals('uploaded')
    .toArray();

  const toDelete = uploaded.filter((f) => (f.uploadedAt ?? 0) < cutoff);
  for (const file of toDelete) {
    await db.mediaFiles.delete(file.id);
  }
}

function guessExtension(mimeType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'video/mp4': 'mp4',
    'video/quicktime': 'mov',
    'audio/mpeg': 'mp3',
    'audio/webm': 'webm'
  };
  return map[mimeType] ?? 'bin';
}
