import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User
} from 'firebase/auth';
import { doc, setDoc, getDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { v4 as uuid } from 'uuid';
import { auth, firestore } from '@/services/firebase/config';

const googleProvider = new GoogleAuthProvider();

function isPermissionDenied(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === 'permission-denied';
}

/**
 * בהרשמה ראשונה יוצרים גם רשומת "משפחה" חדשה עם המשתמש כ-owner.
 * זהו ה-familyId שישמש את כל הרשומות (ילדים, ציוני דרך) של המשתמש הזה,
 * ועליו נשענים כל Security Rules הבידוד בין משפחות.
 *
 * חשוב - מה שונה מהגרסה הקודמת: אם כבר קיים familyId ברשומת המשתמש, *לעולם*
 * לא יוצרים משפחה חדשה ולא דורסים אותו. בעבר כל כשל בקריאה (רשת, הרשאות) גרם
 * ליצירת משפחה חדשה ולדריסת ה-familyId, וכל הנתונים שכבר הועלו נשארו תלויים
 * תחת מזהה ישן שאף אחד לא מצביע אליו - ולכן אחרי התקנה מחדש "לא חזר שום דבר".
 * עכשיו: אם רשומת החברות חסרה, מתקנים אותה *תחת אותו familyId*, והנתונים חוזרים.
 * שגיאות רשת פשוט נזרקות הלאה (ללא שינוי בענן) והניסיון הבא יתקן.
 */
export async function ensureFamilyExists(user: User): Promise<string> {
  const userDocRef = doc(firestore, 'users', user.uid);
  const userDoc = await getDoc(userDocRef);

  const existingFamilyId = userDoc.exists() ? (userDoc.data().familyId as string | undefined) : undefined;

  if (existingFamilyId) {
    await repairMembershipIfMissing(user.uid, existingFamilyId);
    return existingFamilyId;
  }

  const familyId = uuid();
  await setDoc(doc(firestore, 'families', familyId), {
    ownerId: user.uid,
    createdAt: serverTimestamp()
  });
  await setDoc(doc(firestore, 'families', familyId, 'members', user.uid), {
    role: 'owner',
    joinedAt: serverTimestamp()
  });
  await setDoc(
    userDocRef,
    {
      displayName: user.displayName ?? '',
      email: user.email ?? '',
      photoURL: user.photoURL ?? '',
      familyId,
      createdAt: serverTimestamp()
    },
    { merge: true }
  );

  return familyId;
}

/**
 * מוודא שהמשתמש עדיין רשום כחבר במשפחה שלו, ומתקן אם לא - תחת אותו familyId.
 *
 * קריאה של מסמך חברות שלא קיים נחסמת ע"י הכללים (הכלל תלוי בקיום המסמך עצמו),
 * ולכן permission-denied כאן פירושו "החברות חסרה". כל שגיאה אחרת (למשל רשת)
 * נזרקת הלאה בלי לשנות דבר.
 */
async function repairMembershipIfMissing(uid: string, familyId: string): Promise<void> {
  const memberRef = doc(firestore, 'families', familyId, 'members', uid);

  try {
    const member = await getDoc(memberRef);
    if (member.exists()) return;
  } catch (err) {
    if (!isPermissionDenied(err)) throw err;
  }

  // מסמך המשפחה עצמו אולי נמחק. אם הוא קיים, העדכון ייחסם (אין לנו עדיין הרשאה) - וזה בסדר.
  try {
    await setDoc(doc(firestore, 'families', familyId), {
      ownerId: uid,
      createdAt: serverTimestamp()
    });
  } catch (err) {
    if (!isPermissionDenied(err)) throw err;
  }

  await setDoc(memberRef, { role: 'owner', joinedAt: serverTimestamp() });
}

export async function signUpWithEmail(email: string, password: string, displayName: string) {
  const { user } = await createUserWithEmailAndPassword(auth, email, password);
  await ensureFamilyExists({ ...user, displayName } as User);
  return user;
}

export async function signInWithEmail(email: string, password: string) {
  const { user } = await signInWithEmailAndPassword(auth, email, password);
  await ensureFamilyExists(user);
  return user;
}

export async function signInWithGoogle() {
  const { user } = await signInWithPopup(auth, googleProvider);
  await ensureFamilyExists(user);
  return user;
}

export async function signOut() {
  await firebaseSignOut(auth);
}

export function subscribeToAuthChanges(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export async function getFamilyIdForUser(userId: string): Promise<string | null> {
  const userDoc = await getDoc(doc(firestore, 'users', userId));
  return userDoc.exists() ? (userDoc.data().familyId as string) : null;
}

/**
 * מאזין חי (לא קריאה חד-פעמית) לרשומת המשתמש בפיירסטור.
 *
 * זה קריטי כדי לפתור מרוץ תזמון: ברגע ההרשמה, מצב האימות (auth state) משתנה
 * *מיד* אחרי יצירת המשתמש, עוד לפני ש-ensureFamilyExists הספיק לכתוב את
 * רשומת המשפחה. אם היינו קוראים את familyId פעם אחת בלבד באותו רגע,
 * היינו מקבלים null לצמיתות (עד רענון ידני של האפליקציה) - וזה בדיוק מה שגרם
 * לכפתור "הוספת ילד" להיכשל בשקט. עם מאזין חי, ברגע שהרשומה נכתבת בפועל
 * (שברי שנייה אחר כך), העדכון מגיע אוטומטית וה-UI משתחרר.
 */
export function subscribeToUserFamilyId(
  userId: string,
  callback: (familyId: string | null) => void,
  onError?: (err: unknown) => void
) {
  return onSnapshot(
    doc(firestore, 'users', userId),
    (snapshot) => {
      callback(snapshot.exists() ? ((snapshot.data().familyId as string) ?? null) : null);
    },
    (err) => {
      // כשלון קריאה (למשל הרשאות) - לא מפילים את האפליקציה, אבל כן מדווחים
      // למי שהאזין, כדי שמסך הטעינה לא יישאר תקוע לנצח.
      onError?.(err);
    }
  );
}
