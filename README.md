# מסלול 🌿

אפליקציית תיעוד מסע ההתפתחות והזיכרונות של הילדים שלכם - עברית מלאה, RTL, ועם תמיכה אמיתית במצב אופליין.

למסמך הארכיטקטורה המלא (מבנה נתונים, מנגנון סנכרון, החלטות סקופ) ראו [`ARCHITECTURE.md`](./ARCHITECTURE.md).

## הרצה מקומית

```bash
npm install
npm run dev
```

האפליקציה תיפתח בכתובת `http://localhost:5173`. בשלב זה היא עובדת במלואה מול **IndexedDB מקומי** - אפשר ליצור ילד, להוסיף ציוני דרך, לצלם תמונות, לסגור את הדפדפן ולפתוח מחדש, והמידע יישאר. הסנכרון לענן עדיין לא פעיל עד שתחברו פרויקט Firebase (ראו למטה).

## חיבור Firebase (נדרש לפני שימוש אמיתי)

1. כנסו ל-[console.firebase.google.com](https://console.firebase.google.com) וצרו פרויקט חדש (תוכנית Spark החינמית מספיקה להתחלה).
2. הוסיפו אפליקציית Web לפרויקט.
3. הפעילו בתפריט הצד:
   - **Authentication** → Sign-in method → הפעילו Email/Password ו-Google
   - **Firestore Database** → צרו מסד נתונים (במצב production)
   - **Storage** → הפעילו אחסון
4. העתיקו את קובץ `.env.local.example` לקובץ חדש בשם `.env.local` (בשורש הפרויקט), ומלאו בו את הערכים מקונסולת Firebase:
   ```bash
   cp .env.local.example .env.local
   ```
   פרטי הקונפיגורציה נמצאים ב-Project settings → General → Your apps → SDK setup and configuration.
   קובץ `.env.local` לא נכנס לגיט (הוא כבר ב-`.gitignore`) - כך המפתחות שלכם נשארים פרטיים.
5. פרסו את חוקי האבטחה:
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase init   # בחרו בפרויקט שיצרתם, קבלו את firestore.rules ו-storage.rules הקיימים
   firebase deploy --only firestore:rules,storage:rules
   ```

## בנייה לפרודקשן + התקנה כ-PWA באנדרואיד

```bash
npm run build
npm run preview   # לבדיקה מקומית של גרסת הפרודקשן
```

לפריסה אמיתית (כדי שתוכלו להתקין על הטלפון):
```bash
firebase deploy --only hosting
```
לאחר מכן פתחו את הכתובת שתקבלו בכרום באנדרואיד, ולחצו "הוסף למסך הבית" - האפליקציה תתקין את עצמה כ-PWA לכל דבר.

## התקנה כ-APK על טלפון ללא Google Play וללא דפדפן

אם הטלפון שלכם (למשל אנדרואיד 14 ללא חנות Google וללא דפדפן) לא יכול להתקין PWA בדרך הרגילה, האפליקציה עטופה גם כ**אפליקציית Android נייטיבית** (באמצעות Capacitor) שמייצרת קובץ APK רגיל להתקנה ישירה.

### שלב א' - הגדרת ה-Secrets (פעם אחת)

בריפו ב-GitHub: **Settings → Secrets and variables → Actions → New repository secret**, והוסיפו שישה secrets עם אותם שמות וערכים כמו ב-`.env.local` שלכם:
```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```

### שלב ב' - בניית ה-APK

כל push לענף `main` מפעיל אוטומטית בנייה (ב-GitHub Actions, על שרתי GitHub - לא אצלכם במחשב). אפשר גם להפעיל ידנית: בריפו לכו ל-לשונית **Actions → בניית APK לאנדרואיד → Run workflow**.

הבנייה נמשכת כמה דקות. בסיומה, גללו למטה לחלק **"Artifacts"** באותו run, ותורידו את **`maslul-app-apk`** - זהו קובץ ה-APK. חלצו אותו מה-zip שיורד.

### שלב ג' - העברה והתקנה בטלפון

1. העבירו את קובץ ה-`app-debug.apk` למכשיר (כבל USB או בלוטות')
2. בטלפון, פתחו את מנהל הקבצים ותלחצו על הקובץ להתקנה
3. ייתכן שתצטרכו לאשר **"התקנה ממקורות לא ידועים"** (Install unknown apps) עבור אפליקציית מנהל הקבצים - זו הגדרה סטנדרטית באנדרואיד, לא קשורה ל-Google Play

**הערה חשובה**: זו גרסת "debug" - חתומה במפתח פיתוח גנרי, לא מיועדת להפצה בחנויות אפליקציות, אבל מותקנת ורצה בצורה תקינה לחלוטין למטרות שימוש אישי/משפחתי. בתוך האפליקציה, מומלץ להתחבר עם **אימייל וסיסמה** ולא עם Google - כניסה עם חשבון Google בתוך WebView מוטמע לפעמים חסומה על ידי גוגל.



✅ בנוי במלואו: ליבת ה-offline (IndexedDB + תור סנכרון + שמירת מדיה מקומית), Firebase Auth מלא (אימייל/סיסמה + Google, כולל יצירת רשומת משפחה אוטומטית בהרשמה), מסך התחברות/הרשמה, מסך בית, מסך מסלול/ציר זמן, הוספה מהירה, חישוב גיל אוטומטי, PWA manifest + service worker, Firebase Security Rules, עטיפת Capacitor לאנדרואיד + GitHub Actions שבונה APK אוטומטית.

🚧 טרם נבנה: מסכי גלריה/חיפוש/משפטים מצחיקים/הגדרות, ניהול ילדים נוסף מעבר לילד ראשון.

📋 מתוכנן לשלב ב' (ראו `ARCHITECTURE.md` סעיף 0): ספר זיכרונות + PDF, גרפי גדילה, הקלטות קול, שיתוף משפחתי עם הרשאות, פתרון קונפליקטים מתקדם.

## מבנה הפרויקט

ראו סעיף 6 ב-[`ARCHITECTURE.md`](./ARCHITECTURE.md).
