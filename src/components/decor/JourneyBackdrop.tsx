/**
 * רקע דקורטיבי למסך הבית - שבילי גבעות עדינים ושמש רכה, בהשראת "מסע" משפחתי.
 * מצויר כ-SVG מקורי בפלטת האפליקציה בלבד (sand/honey/sage) - לא מכיל תמונות
 * או תוכן מועתק, רק צורת רקע דקורטיבית תומכת-אווירה.
 */
export function JourneyBackdrop({ tint }: { tint: string }) {
  return (
    <svg
      viewBox="0 0 400 220"
      preserveAspectRatio="xMidYMax slice"
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="journey-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={tint} stopOpacity="0.16" />
          <stop offset="100%" stopColor={tint} stopOpacity="0" />
        </linearGradient>
      </defs>

      <rect width="400" height="220" fill="url(#journey-sky)" />

      {/* שמש רכה */}
      <circle cx="330" cy="42" r="26" fill="#E8C989" opacity="0.35" className="animate-drift" />

      {/* גבעות רחוקות */}
      <path d="M0,140 C60,110 120,150 190,130 C260,110 320,145 400,120 L400,220 L0,220 Z" fill="#8A9B76" opacity="0.1" />
      {/* גבעה קרובה */}
      <path d="M0,175 C80,150 150,185 230,165 C300,150 350,180 400,160 L400,220 L0,220 Z" fill="#C99A4B" opacity="0.12" />

      {/* שביל מתפתל - "המסלול" */}
      <path
        d="M-10,205 C70,190 110,215 170,195 C230,175 260,205 410,180"
        fill="none"
        stroke="#E8DAC2"
        strokeWidth="10"
        strokeLinecap="round"
      />
    </svg>
  );
}
