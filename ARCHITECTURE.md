# מסלול - אפליקציית תיעוד התפתחות ילדים
## מסמך ארכיטקטורה טכני (לפני כתיבת קוד)

> קובץ זה הוא ה"מסמך מכונן" של הפרויקט. הוא יעלה ל-GitHub כ-`ARCHITECTURE.md` וישמש הן אותי (בהמשכי בנייה) והן כל מפתח אחר שיצטרף.

---

## 0. החלטת סקופ - מה נבנה בפועל, ומה נדחה

**סוג הפרויקט בפועל: PWA (Progressive Web App)**, לא אפליקציית Android נייטיב. הסיבה: אין לי יכולת לקמפל/לחתום APK או להתקין על מכשיר. PWA שנבנה נכון מתקין את עצמו על מסך הבית באנדרואיד, פועל במסך מלא, ותומך אופליין מלא - וזה בדיוק מה שגם התבקש בדרישת ה-PWA המקורית.

**Firebase**: כל קוד האינטגרציה (Auth, Firestore, Storage, Security Rules) ייכתב במלואו. אבל אתה תצטרך ליצור פרויקט Firebase משלך (חינמי, 5 דקות בקונסולה) ולספק לי את קובץ ה-config, כי לסביבת הפיתוח שלי אין גישת רשת לשרתי Firebase. עד אז אבנה עם שכבת הפשטה (`DataService` interface) כדי שהאפליקציה תרוץ ותיבדק מיד עם local storage, ותתחבר ל-Firebase האמיתי ברגע שיהיה לך.

### מה נבנה במלואו בשלב א' (MVP)
- ציר זמן / מסלול התקדמות ויזואלי מלא
- ציוני דרך מותאמים אישית עם כל השדות (כותרת, תאריך, גיל אוטומטי, תיאור, קטגוריה, מקום, אנשים, מועדף)
- תמיכה במספר ילדים + מעבר מהיר ביניהם
- גלריה עם כל מסנני התצוגה
- חיפוש
- קטגוריות וצבעים/אייקונים
- "דברים שאמרת" (משפטים מצחיקים)
- זיכרונות חכמים ("היום לפני שנה")
- אבני דרך מוצעות לפי גיל (עם דיסקליימר ברור - לא אבחון רפואי)
- חישוב גיל אוטומטי מדויק
- הוספה מהירה (Quick Add)
- עברית מלאה + RTL, עיצוב חם ומעוגל
- **Offline engine אמיתי**: IndexedDB + Service Worker + תור סנכרון עם סטטוסים
- Firebase integration מלאה בקוד (Auth, Firestore, Storage, Security Rules)

### מה נדחה לשלב ב' (מתועד במבנה הנתונים, לא נבנה עכשיו)
| פיצ'ר | למה נדחה | מה כן מוכן מראש |
|---|---|---|
| ספר זיכרונות אוטומטי + ייצוא PDF | פיצ'ר מורכב בפני עצמו | מבנה הנתונים תומך בשליפה כרונולוגית מלאה |
| גרפי גדילה מול WHO | דורש טבלאות רפואיות + ספריית גרפים נפרדת | סכימת `growthRecords` מוכנה בפיירסטור |
| הקלטות קול | דורש media handling נוסף | שדה `audioUrl` קיים בסכימה, לא מחובר ל-UI |
| שיתוף משפחתי עם הרשאות (מנהל/עריכה/צפייה) | מערכת הרשאות מורכבת | שדה `role` בקולקציית `members`, Security Rules כתובות אך לא מופעלות ב-UI |
| Conflict resolution בין מספר מכשירים בו-זמנית | לוגיקת merge מורכבת | כל רשומה כבר כוללת `updatedAt`/`clientGeneratedId` שמאפשרים להוסיף זאת בהמשך בלי לשנות סכימה |
| Resumable upload בצ'אנקים לסרטונים גדולים | דורש פרוטוקול upload מתקדם | תור סנכרון עם retry בסיסי (לא resume ברמת בייט) |

**החלטה מנחה**: בכל התלבטות בין אפקט ויזואלי לשמירה אמינה של מידע - **תמיד עדיפות לשמירה אמינה**, כפי שביקשת.

---

## 1. ארכיטקטורה כללית

```
┌─────────────────────────────────────────┐
│              UI Layer (React)             │
│   Screens, Components, Hooks               │
├─────────────────────────────────────────┤
│           State Management (Zustand)       │
├──────────────┬──────────────┬─────────────┤
│  DataService  │  SyncEngine   │ MediaUpload  │
│  (interface)  │               │   Service    │
├──────────────┼──────────────┼─────────────┤
│  Local: IndexedDB (Dexie.js)               │
│  Remote: Firestore + Firebase Storage      │
├─────────────────────────────────────────┤
│         Firebase Auth (Google/Email)       │
├─────────────────────────────────────────┤
│      Service Worker (Workbox) + Manifest   │
└─────────────────────────────────────────┘
```

**עיקרון מפתח: Local-First.**
כל פעולת כתיבה (יצירה/עריכה/מחיקה) נכתבת קודם ל-IndexedDB המקומי, ומעדכנת את ה-UI מיידית. רק אח"כ, ברקע, `SyncEngine` מנסה לדחוף את השינוי ל-Firestore. המשתמש **אף פעם** לא מחכה לרשת כדי לראות שהפעולה הצליחה.

### שכבות (Separation of Concerns)
- **`services/data/`** - ממשק אחיד ל-CRUD, לא משנה אם המקור הוא local או remote
- **`services/sync/`** - תור הסנכרון, retry logic, conflict handling
- **`services/media/`** - שמירת מדיה מקומית + העלאה הדרגתית ל-Storage
- **`services/auth/`** - Firebase Authentication
- **`store/`** - Zustand stores (state גלובלי: משתמש נוכחי, ילד נבחר, וכו')
- **`db/`** - הגדרת סכימת IndexedDB (Dexie)
- **`components/`** - רכיבי UI לשימוש חוזר
- **`screens/`** - מסכים מלאים

---

## 2. מבנה נתונים ב-Firestore

```
users/{userId}
  ├─ displayName, email, photoURL, createdAt

families/{familyId}
  ├─ ownerId
  ├─ createdAt
  └─ members/{userId}
        ├─ role: "owner" | "editor" | "viewer"
        ├─ invitedAt, joinedAt

children/{childId}
  ├─ familyId          ← לצורך Security Rules
  ├─ name
  ├─ photoURL
  ├─ birthDate
  ├─ gender             (אופציונלי)
  ├─ themeColor
  ├─ createdAt, createdBy
  ├─ updatedAt, updatedBy
  ├─ clientGeneratedId
  └─ syncStatus

milestones/{milestoneId}
  ├─ familyId, childIds: [childId, ...]   ← מערך, לתמיכה באירוע משותף
  ├─ title, description, parentNote
  ├─ date, time
  ├─ ageAtEvent: { years, months, days }   ← מחושב ונשמר בזמן היצירה
  ├─ category
  ├─ location
  ├─ peoplePresent: [string, ...]
  ├─ isFavorite: boolean
  ├─ mediaRefs: [{ storagePath, type: "image"|"video", localUri? }]
  ├─ createdAt, createdBy, updatedAt, updatedBy
  ├─ clientGeneratedId
  └─ syncStatus: "pending" | "uploading" | "synced" | "failed"

funnyQuotes/{quoteId}
  ├─ familyId, childId
  ├─ quote, date, ageAtEvent, story
  ├─ mediaRefs
  └─ (אותם שדות sync)

growthRecords/{recordId}          ← שלד לשלב ב'
  ├─ familyId, childId
  ├─ date, weight, height, headCircumference
  └─ source: "manual" | "who-reference"

suggestedMilestoneStatus/{statusId}
  ├─ familyId, childId
  ├─ suggestionKey        (מזהה קבוע מתוך רשימת ה-templates המקומית)
  └─ status: "happened" | "not-yet" | "skipped" | "not-relevant"
```

**עקרונות מפתח:**
- **אין קבצי מדיה בתוך Firestore.** רק `storagePath` שמצביע ל-Firebase Storage.
- כל רשומה כוללת `clientGeneratedId` (UUID שנוצר במכשיר) - מונע כפילויות אחרי סנכרון חוזר.
- `familyId` בכל מסמך מאפשר Security Rules פשוטים ויעילים.

### Firebase Storage - מבנה תיקיות
```
/families/{familyId}/children/{childId}/milestones/{milestoneId}/{fileId}.jpg
/families/{familyId}/children/{childId}/milestones/{milestoneId}/{fileId}.mp4
```

### Security Rules - עיקרון הבסיס
```
match /children/{childId} {
  allow read, write: if request.auth != null
    && exists(/databases/$(database)/documents/families/$(resource.data.familyId)/members/$(request.auth.uid));
}
```
כלל דומה על כל קולקציה - בדיקת חברות במשפחה לפני כל read/write. יתועד קובץ `firestore.rules` מלא בריפו.

---

## 3. מנגנון ה-Offline - איך זה עובד בפועל

### 3.1 שכבת האחסון המקומית
**Dexie.js** (עטיפה נוחה ל-IndexedDB) עם הטבלאות: `children`, `milestones`, `funnyQuotes`, `syncQueue`, `mediaFiles`.

כל הנתונים הטקסטואליים (כותרות, תיאורים, תאריכים) **תמיד** קיימים באופן מלא ב-IndexedDB - זהו "מקור האמת" המקומי, לא Firestore. ה-UI קורא תמיד מ-IndexedDB דרך hook (`useLiveQuery`), כך שהמסך מתעדכן באופן ריאקטיבי בלי קשר למצב הרשת.

### 3.2 תהליך יצירת ציון דרך (לדוגמה)
1. משתמש ממלא טופס ולוחץ "שמור"
2. `clientGeneratedId` (UUID) נוצר מקומית
3. הרשומה נכתבת מיד ל-IndexedDB עם `syncStatus: "pending"`
4. ה-UI מתעדכן **מיידית** (ללא המתנה לרשת)
5. הרשומה נוספת לתור הסנכרון (`syncQueue` table)
6. `SyncEngine` (רץ ברקע, מאזין ל-`navigator.onLine` ולאירועי `online`/`offline`) מנסה לדחוף לפיירסטור כשיש רשת
7. בהצלחה: `syncStatus` → `"synced"`, נשמר גם ב-IndexedDB לצורך תצוגה עקבית
8. בכישלון: `syncStatus` → `"failed"`, retry אוטומטי עם exponential backoff, וגם כפתור "נסה שוב" ידני

### 3.3 מדוע זה שורד סגירת אפליקציה מלאה
IndexedDB הוא אחסון **קבוע בדיסק** של הדפדפן/המכשיר - בניגוד ל-state בזיכרון RAM, הוא לא נמחק כשסוגרים את הטאב/אפליקציה. גם Service Worker לא נדרש בשביל זה (SW מטפל בקבצים סטטיים ל-offline loading, לא בנתוני משתמש) - זו בדיוק הסיבה שבמסמך המקורי מודגש "אין להסתמך על Service Worker לשמירת נתונים", וזה מיושם כאן: SW אחראי רק ל-shell של האפליקציה, ו-IndexedDB אחראי לנתונים.

בעת פתיחת האפליקציה מחדש, `SyncEngine` סורק את `syncQueue` ומחדש כל פעולה שלא הושלמה - כולל אחרי אתחולים חוזרים.

### 3.4 סטטוסים המוצגים למשתמש
| סטטוס | אייקון | משמעות |
|---|---|---|
| `pending` | ☁ | ממתין לחיבור אינטרנט |
| `uploading` | ↑ | מעלה כרגע |
| `synced` | ✓ | נשמר וסונכרן בהצלחה |
| `failed` | ⚠ | ההעלאה נכשלה - לחץ לניסיון חוזר |

---

## 4. איך תמונות וסרטונים נשמרים ומועלים

זו הדרישה הקריטית ביותר, ולכן יש לה מנגנון ייעודי נפרד מהטקסט.

### 4.1 בזמן הצילום/בחירה (offline או online)
1. הקובץ (Blob) נשמר **ישירות ב-IndexedDB** (טבלת `mediaFiles`), לא רק כ-`object URL` זמני בזיכרון - כי `object URL` נעלם ברגע שהטאב נסגר.
2. נוצרת רשומה: `{ fileId, milestoneId, blob, mimeType, sizeBytes, status: "pending" }`
3. ה-UI מציג תצוגה מקדימה מיד מתוך ה-Blob המקומי (לא צריך רשת כדי לראות את התמונה שצילמת).

### 4.2 העלאה בפועל (כשיש רשת)
1. `MediaUploadService` שולף קבצים בסטטוס `pending`/`failed` מ-`mediaFiles`
2. מעלה ל-Firebase Storage בנתיב הקבוע (ראה סעיף 2)
3. **סרטונים גדולים**: העלאה עם מעקב התקדמות (`uploadBytesResumable` של Firebase SDK, שתומך resume ברמת ה-session אם החיבור מתנתק לרגע - זו יכולת מובנית שאין צורך לבנות מאפס)
4. אם ההעלאה נכשלת (למשל האפליקציה נסגרה באמצע) - הקובץ המקומי **נשאר שלם** ב-IndexedDB, והתור ינסה שוב באתחול הבא
5. בהצלחה: `storagePath` נכתב לרשומת ה-milestone בפיירסטור, וה-Blob המקומי מסומן כ-`uploaded` (לא נמחק מיד - ראו מדיניות ניקוי)

### 4.3 מדיניות ניקוי (Cleanup Policy)
כדי לא למלא את אחסון המכשיר, Blob מקומי יימחק **רק** כאשר:
- הועלה בהצלחה **וגם**
- אושר שרשומת Firestore המקבילה עודכנה **וגם**
- עברו לפחות X ימים (קונפיגורבילי, ברירת מחדל 7) - כרשת ביטחון למקרה של תקלה בצד השרת

### 4.4 מגבלת אחסון בדפדפן
Chrome על Android בדרך כלל מקצה מאות MB עד כמה GB ל-Origin (תלוי באחסון הפנוי במכשיר). נציג למשתמש התראה עדינה אם השימוש מתקרב למכסה, ונעדיף להשלים סנכרון על פני צבירת קבצים רבים לא מסונכרנים.

---

## 5. רשימת המסכים (MVP)

1. **התחברות/הרשמה** - Firebase Auth (אימייל/סיסמה + Google)
2. **בחירת/יצירת ילד ראשון** (onboarding)
3. **מסך בית** - תמונת הילד, גיל, ציון דרך אחרון, זיכרון מהעבר, כפתור "+ הוסף רגע"
4. **ציר זמן / מסלול התקדמות** - המסך המרכזי, תצוגת "דרך" אנכית עם תחנות
5. **כרטיס ציון דרך** (מודאל/מסך) - תצוגה מלאה עם מדיה
6. **הוספת/עריכת ציון דרך** - טופס מהיר + הרחבה אופציונלית
7. **גלריה** - עם מסננים (תאריך/גיל/שנה/קטגוריה/מועדפים)
8. **חיפוש**
9. **דברים שאמרת** (רשימת משפטים מצחיקים + הוספה)
10. **אבני דרך מוצעות לפי גיל** - עם סימון סטטוס
11. **זיכרונות** ("היום לפני שנה")
12. **ניהול ילדים** - רשימה + הוספה + עריכת פרופיל ילד
13. **הגדרות** - חשבון, ניהול משפחה (שלד לשלב ב'), פרטיות
14. **מסך Offline** - מוצג כשאין רשת בכלל בעת טעינה ראשונית

---

## 6. מבנה תיקיות ופרויקט

```
milestone-app/
├─ public/
│  ├─ manifest.json
│  ├─ icons/
│  └─ offline.html
├─ src/
│  ├─ main.tsx
│  ├─ App.tsx
│  ├─ screens/
│  │  ├─ Auth/
│  │  ├─ Home/
│  │  ├─ Timeline/
│  │  ├─ MilestoneForm/
│  │  ├─ Gallery/
│  │  ├─ Search/
│  │  ├─ FunnyQuotes/
│  │  ├─ SuggestedMilestones/
│  │  ├─ Memories/
│  │  ├─ ChildrenManagement/
│  │  └─ Settings/
│  ├─ components/
│  │  ├─ ui/                    (כפתורים, קלטים, כרטיסים גנריים)
│  │  ├─ timeline/
│  │  ├─ media/
│  │  └─ sync-status/
│  ├─ services/
│  │  ├─ auth/
│  │  ├─ data/                  (ממשק CRUD מופשט)
│  │  ├─ sync/                  (SyncEngine)
│  │  ├─ media/                 (MediaUploadService)
│  │  └─ firebase/               (init, config)
│  ├─ db/
│  │  └─ schema.ts               (הגדרת Dexie)
│  ├─ store/                     (Zustand)
│  ├─ hooks/
│  ├─ utils/
│  │  ├─ ageCalculator.ts
│  │  └─ dateHelpers.ts
│  ├─ types/
│  └─ styles/
├─ firestore.rules
├─ storage.rules
├─ firebase.json
├─ package.json
└─ ARCHITECTURE.md               (קובץ זה)
```

---

## 7. הצעות לפיצ'רים נוספים (לשיקולך)

- **תזכורות עדינות**: "לא הוספתם זיכרון החודש" - לא פולשני, ניתן לכיבוי
- **מצב "משפחה מרובת שפות"**: לתמוך גם באנגלית בהמשך (מבנה ה-i18n מוכן מראש גם אם רק עברית פעילה כרגע)
- **Widget קטן ל"זיכרון של היום"** בעמוד הבית - מגביר שימוש חוזר
- **ייצוא ציון דרך בודד כתמונה משותפת** (לא רשת חברתית - שיתוף פרטי לוואטסאפ למשל) - הבדל חשוב מ"פרופיל ציבורי"
- **מצב כהה (Dark Mode)** - קל להוסיף עם משתני CSS מהיום הראשון

---

## 8. סדר העבודה מכאן

1. ✅ מסמך זה
2. הקמת שלד הפרויקט (Vite + React + TypeScript + Tailwind)
3. שכבת IndexedDB (Dexie schema) + Sync Engine + Media Service - **הליבה הקריטית**, נבנה ונבדק ראשון, בלי תלות ב-Firebase אמיתי
4. UI: מסך בית → ציר זמן → טופס הוספה מהירה
5. שאר המסכים
6. אינטגרציית Firebase אמיתית (ברגע שתספק config)
7. PWA: manifest + service worker
8. Security Rules סופיים

---

*מסמך זה יעודכן ככל שהפרויקט מתקדם. הוא משקף את מלוא ההיקף המוסכם לשלב א', כולל מה שנדחה בכוונה לשלב ב'.*
