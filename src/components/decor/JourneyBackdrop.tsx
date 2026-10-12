/**
 * איור "מסע" לכותרת מסך הבית: שמיים רכים, בלון פורח, גבעות ירקרקות ושביל מתפתל.
 * מצויר כ-SVG מקורי בפלטת האפליקציה (חול/דבש/מרווה) - לא מכיל תמונות מועתקות.
 *
 * variant="hero" - האיור המלא לראש מסך הבית.
 * variant="soft" - גרסה שקטה לרקעים (מסך ריק, התחברות).
 */
interface Props {
  tint: string;
  variant?: 'hero' | 'soft';
}

export function JourneyBackdrop({ tint, variant = 'hero' }: Props) {
  const hero = variant === 'hero';

  return (
    <svg
      viewBox="0 0 400 240"
      preserveAspectRatio="xMidYMid slice"
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="jb-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={tint} stopOpacity={hero ? 0.1 : 0.18} />
          <stop offset="60%" stopColor="#E8C989" stopOpacity={hero ? 0.14 : 0.1} />
          <stop offset="100%" stopColor="#FCFAF6" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="jb-balloon" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#E3B8A4" />
          <stop offset="50%" stopColor="#E8C989" />
          <stop offset="100%" stopColor="#D9A25F" />
        </linearGradient>
        <radialGradient id="jb-sun" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#F6DDA0" stopOpacity="0.95" />
          <stop offset="60%" stopColor="#F2D18A" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#F2D18A" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="400" height="240" fill="url(#jb-sky)" />

      {/* שמש רכה */}
      <circle cx="318" cy="112" r="46" fill="url(#jb-sun)" />

      {hero && (
        <>
          {/* עננים */}
          <g fill="#fff" opacity="0.75">
            <ellipse cx="262" cy="52" rx="28" ry="8" />
            <ellipse cx="282" cy="45" rx="17" ry="9" />
            <ellipse cx="240" cy="47" rx="14" ry="7" />
          </g>
          <g fill="#fff" opacity="0.55">
            <ellipse cx="130" cy="38" rx="22" ry="6" />
            <ellipse cx="146" cy="33" rx="13" ry="7" />
          </g>

          {/* בלון פורח */}
          <g className="animate-drift" transform="translate(-62 26) scale(0.9)">
            <path d="M54,58 C54,38 68,26 84,26 C100,26 114,38 114,58 C114,72 100,86 91,92 L77,92 C68,86 54,72 54,58 Z" fill="url(#jb-balloon)" />
            <path d="M84,26 C74,38 72,74 78,92 L91,92 C97,74 95,38 84,26 Z" fill="#fff" opacity="0.28" />
            <path d="M69,34 C62,46 62,66 70,82" fill="none" stroke="#B97A5E" strokeWidth="2" opacity="0.35" />
            <path d="M77,92 L80,104 M91,92 L88,104" stroke="#7A5C2C" strokeWidth="1.2" opacity="0.55" />
            <rect x="77" y="103" width="11" height="8" rx="2" fill="#B97A5E" />
          </g>
        </>
      )}

      {/* גבעות רחוקות */}
      <path d="M0,150 C50,126 105,142 160,134 C215,126 262,150 332,132 C366,124 386,130 400,136 L400,240 L0,240 Z" fill="#A9B796" opacity="0.5" />
      {/* גבעות אמצע */}
      <path d="M0,178 C60,154 122,174 192,160 C262,146 324,174 400,154 L400,240 L0,240 Z" fill="#8A9B76" opacity="0.55" />
      {/* גבעה קרובה */}
      <path d="M0,206 C84,186 154,210 232,194 C304,180 360,204 400,192 L400,240 L0,240 Z" fill="#C9D1B5" opacity="0.8" />

      {hero && (
        <>
          {/* שביל מתפתל */}
          <path
            d="M176,240 C196,222 156,212 204,196 C240,184 214,172 236,162 L243,164 C224,176 250,188 214,204 C174,218 214,226 236,240 Z"
            fill="#F6EEDD"
            opacity="0.95"
          />

          {/* עצים */}
          <g>
            <rect x="46" y="150" width="3" height="12" fill="#7A5C2C" opacity="0.6" />
            <circle cx="47.5" cy="146" r="11" fill="#6F8259" />
            <circle cx="43" cy="143" r="6" fill="#8A9B76" />

            <rect x="76" y="158" width="3" height="10" fill="#7A5C2C" opacity="0.6" />
            <circle cx="77.5" cy="154" r="9" fill="#7D8E69" />

            <rect x="344" y="146" width="3" height="12" fill="#7A5C2C" opacity="0.6" />
            <circle cx="345.5" cy="142" r="11" fill="#6F8259" />
            <circle cx="350" cy="139" r="6" fill="#8A9B76" />

            <rect x="318" y="156" width="3" height="10" fill="#7A5C2C" opacity="0.6" />
            <circle cx="319.5" cy="152" r="8" fill="#7D8E69" />
          </g>
        </>
      )}
    </svg>
  );
}
