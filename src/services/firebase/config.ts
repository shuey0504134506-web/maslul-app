import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

/**
 * פרטי הפרויקט נטענים ממשתני סביבה (קובץ .env.local, לא נכנס לגיט) -
 * כך שהמפתחות שלכם לא נחשפים בהיסטוריית הריפו.
 *
 * לפני הרצה ראשונה:
 * 1. העתיקו את .env.local.example לקובץ חדש בשם .env.local
 * 2. מלאו בו את הערכים מקונסולת Firebase (Project settings → General → Your apps)
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

if (!firebaseConfig.apiKey) {
  // eslint-disable-next-line no-console
  console.warn(
    'לא נמצאו פרטי Firebase. העתיקו את .env.local.example ל-.env.local ומלאו את הערכים מקונסולת Firebase.'
  );
}

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const firestore = getFirestore(firebaseApp);
export const storage = getStorage(firebaseApp);
