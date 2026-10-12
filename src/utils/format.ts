/** "2022-01-12" -> "12.01.2022" (בלי תלות בהגדרות האזור של המכשיר) */
export function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-');
  if (!year || !month || !day) return iso;
  return `${day}.${month}.${year}`;
}
