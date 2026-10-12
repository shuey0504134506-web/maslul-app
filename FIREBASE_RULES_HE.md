# עדכון כללי האבטחה ב-Firebase (חובה, פעם אחת)

בלי הצעד הזה הנתונים לא יחזרו מהענן אחרי התקנה מחדש.

1. היכנסו ל-https://console.firebase.google.com ובחרו את הפרויקט.
2. **Firestore Database → Rules**: מחקו את כל הטקסט, הדביקו את התוכן של הקובץ `firestore.rules`, ולחצו **Publish**.
3. **Storage → Rules**: אותו דבר עם הקובץ `storage.rules`, ולחצו **Publish**.
4. באפליקציה: הגדרות → **משוך מהענן עכשיו**.

אם מופיע באנר שגיאה עם permission-denied, סימן שהכללים עדיין לא פורסמו.
