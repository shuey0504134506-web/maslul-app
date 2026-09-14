import type { AgeAtEvent } from '@/types';

/**
 * מחשב גיל מדויק (שנים/חודשים/ימים) נכון לתאריך אירוע נתון - לא לתאריך הנוכחי.
 * זה מה שמאפשר להוסיף בדיעבד זיכרונות מלפני שנים ולקבל גיל נכון לאותו רגע.
 */
export function calculateAgeAtDate(birthDateISO: string, eventDateISO: string): AgeAtEvent {
  const birth = new Date(birthDateISO + 'T00:00:00');
  const event = new Date(eventDateISO + 'T00:00:00');

  if (event < birth) {
    // אירוע לפני הלידה (למשל תמונת אולטרסאונד) - לא שגיאה, פשוט גיל 0
    return { years: 0, months: 0, days: 0, label: 'לפני הלידה' };
  }

  let years = event.getFullYear() - birth.getFullYear();
  let months = event.getMonth() - birth.getMonth();
  let days = event.getDate() - birth.getDate();

  if (days < 0) {
    months -= 1;
    const daysInPrevMonth = new Date(event.getFullYear(), event.getMonth(), 0).getDate();
    days += daysInPrevMonth;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  return { years, months, days, label: formatAgeLabel(years, months, days) };
}

function formatAgeLabel(years: number, months: number, days: number): string {
  const parts: string[] = [];

  if (years > 0) {
    parts.push(years === 1 ? 'שנה' : years === 2 ? 'שנתיים' : `${years} שנים`);
  }
  if (months > 0) {
    parts.push(months === 1 ? 'חודש' : months === 2 ? 'חודשיים' : `${months} חודשים`);
  }
  if (days > 0 || parts.length === 0) {
    parts.push(days === 1 ? 'יום' : days === 2 ? 'יומיים' : `${days} ימים`);
  }

  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} ו${parts[1]}`;
  return `${parts[0]}, ${parts[1]} ו${parts[2]}`;
}

/** גיל נוכחי מדויק, לשימוש בכרטיס הילד במסך הבית */
export function calculateCurrentAge(birthDateISO: string): AgeAtEvent {
  const todayISO = new Date().toISOString().slice(0, 10);
  return calculateAgeAtDate(birthDateISO, todayISO);
}
