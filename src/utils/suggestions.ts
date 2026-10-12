/**
 * הצעות לציוני דרך נפוצים, לכרטיס "הצעד הבא" במסך הבית.
 * זו רשימה סטטית לתצוגה בלבד - היא לא נשמרת ולא משנה את מסד הנתונים.
 * הגילאים הם אומדן כללי בלבד ואינם הערכה רפואית.
 */
interface Suggestion {
  title: string;
  /** מילות מפתח: אם אחת מהן מופיעה בכותרת של רגע קיים - נחשב שכבר תועד */
  keys: string[];
  months: number;
}

const SUGGESTIONS: Suggestion[] = [
  { title: 'חיוך ראשון', keys: ['חיוך'], months: 2 },
  { title: 'צחוק ראשון', keys: ['צחוק'], months: 4 },
  { title: 'התהפכות ראשונה', keys: ['התהפכות'], months: 5 },
  { title: 'שן ראשונה', keys: ['שן ראשונה'], months: 7 },
  { title: 'ישיבה ראשונה', keys: ['ישיבה'], months: 7 },
  { title: 'זחילה ראשונה', keys: ['זחילה'], months: 9 },
  { title: 'מילה ראשונה', keys: ['מילה'], months: 11 },
  { title: 'צעד ראשון', keys: ['צעד', 'הליכה'], months: 12 },
  { title: 'יום הולדת ראשון', keys: ['יום הולדת'], months: 12 },
  { title: 'ריצה ראשונה', keys: ['ריצה'], months: 18 },
  { title: 'ציור ראשון', keys: ['ציור'], months: 20 },
  { title: 'משפט ראשון', keys: ['משפט'], months: 24 },
  { title: 'יום ראשון בגן', keys: ['גן'], months: 30 },
  { title: 'רכיבה ראשונה על אופניים', keys: ['אופני'], months: 48 },
  { title: 'כתיבת השם', keys: ['כתיבת השם', 'כתב את שמו', 'כתבה את שמה'], months: 60 },
  { title: 'שן נופלת ראשונה', keys: ['שן נופלת', 'נפלה שן'], months: 72 },
  { title: 'יום ראשון בכיתה א׳', keys: ['כיתה א'], months: 72 }
];

export interface NextSuggestion {
  title: string;
  /** תיאור קצר מתי זה נפוץ, למשל "בעוד כ-3 חודשים" או "בגיל הקרוב" */
  hint: string;
}

function normalize(text: string): string {
  return text.replace(/["'׳״]/g, '').toLowerCase();
}

export function pickNextSuggestion(ageInMonths: number, existingTitles: string[]): NextSuggestion | null {
  const titles = existingTitles.map(normalize);

  const upcoming = SUGGESTIONS.filter(
    (s) => s.months >= ageInMonths - 1 && !s.keys.some((key) => titles.some((t) => t.includes(normalize(key))))
  ).sort((a, b) => a.months - b.months)[0];

  if (!upcoming) return null;

  const delta = upcoming.months - ageInMonths;
  let hint: string;
  if (delta <= 1) hint = 'בגיל הקרוב';
  else if (delta < 12) hint = `בעוד כ-${delta} חודשים`;
  else hint = `בעוד כ-${Math.round(delta / 12)} שנים`;

  return { title: upcoming.title, hint };
}
