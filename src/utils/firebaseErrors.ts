/**
 * תרגום שגיאות Firebase להודעה בעברית שאפשר לפעול לפיה.
 * משמש גם את תור הסנכרון, גם את מסך ההגדרות וגם את באנר השגיאות.
 */

const MESSAGES: Record<string, string> = {
  'permission-denied':
    'אין הרשאה. הסיבה השכיחה: כללי האבטחה (Rules) ב-Firebase לא פורסמו, פג תוקפם, או שהם לא תואמים לגרסה הזו של האפליקציה.',
  unavailable: 'אין חיבור יציב לשרת. ננסה שוב אוטומטית.',
  unauthenticated: 'צריך להתחבר מחדש.',
  'resource-exhausted': 'חרגתם ממכסת השימוש החינמית של Firebase להיום. היא מתאפסת מדי יום.',
  'failed-precondition': 'חסר אינדקס או תנאי מקדים ב-Firebase. פרטים בקונסולת הדפדפן.',
  'deadline-exceeded': 'השרת לא הגיב בזמן. ננסה שוב אוטומטית.',
  'storage/unauthorized':
    'אין הרשאה להעלות קבצים. כללי ה-Storage ב-Firebase לא פורסמו או לא תואמים.',
  'storage/quota-exceeded': 'חרגתם ממכסת האחסון ב-Firebase Storage.',
  'storage/retry-limit-exceeded': 'ההעלאה נכשלה בגלל חיבור לא יציב. ננסה שוב אוטומטית.',
  'storage/canceled': 'ההעלאה בוטלה.'
};

export interface DescribedError {
  code: string;
  message: string;
}

export function describeError(err: unknown): DescribedError {
  const code =
    typeof err === 'object' && err !== null && 'code' in err
      ? String((err as { code: unknown }).code).replace(/^firestore\//, '')
      : '';
  const raw = err instanceof Error ? err.message : String(err);
  return { code, message: MESSAGES[code] ?? raw };
}
