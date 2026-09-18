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

/**
 * בהרשמה ראשונה יוצרים גם רשומת "משפחה" חדשה עם המשתמש כ-owner.
 * זהו ה-familyId שישמש את כל הרשומות (ילדים, ציוני דרך) של המשתמש הזה,
 * ועליו נשענים כל Security Rules הבידוד בין משפחות.
 */
export async function ensureFamilyExists(user: User): Promise<string> {
  const userDocRef = doc(firestore, 'users', user.uid);
  const userDoc = await getDoc(userDocRef);

  const existingFamilyId = userDoc.exists() ? (userDoc.data().familyId as string | undefined) : undefined;

  if (existingFamilyId) {
    // חשוב: לא מספיק שהשדה familyId קיים ברשומת המשתמש - חייבים לוודא
    // שרשומת המשפחה עצמה עדיין קיימת בפועל (למשל, נמחקה ידנית מהקונסולה).
    //
    // שים לב: getDoc על מסמך שאין לנו הרשאת קריאה אליו זורק permission-denied
    // (Firestore לא מבדיל בין "אין הרשאה" ל"לא קיים"). זה בדיוק המצב אחרי
    // שהמשפחה נמחקה - רשומת ה-members שלנו נמחקה איתה, ולכן אין לנו יותר
    // הרשאת קריאה למשפחה. לכן אנחנו תופסים את השגיאה ומתייחסים אליה
    // כאילו המשפחה לא קיימת, ולא נותנים לה לעצור את כל התהליך.
    let familyStillExists = false;
    try {
      const familyDoc = await getDoc(doc(firestore, 'families', existingFamilyId));
      familyStillExists = familyDoc.exists();
    } catch {
      familyStillExists = false;
    }

    if (familyStillExists) {
      return existingFamilyId;
    }
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
  callback: (familyId: string | null) => void
) {
  return onSnapshot(
    doc(firestore, 'users', userId),
    (snapshot) => {
      callback(snapshot.exists() ? ((snapshot.data().familyId as string) ?? null) : null);
    },
    () => {
      // כשלון קריאה (למשל בהיעדר רשת) - לא מפילים את האפליקציה,
      // פשוט משאירים את המצב הקודם עד שהחיבור יחזור.
    }
  );
}
