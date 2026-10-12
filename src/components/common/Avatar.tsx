import type { Child } from '@/types';

interface Props {
  child: Pick<Child, 'name' | 'themeColor' | 'photoURL'>;
  /** קוטר בפיקסלים */
  size?: number;
  /** טבעת צבעונית מסביב, כמו בכרטיס הילד במסך הבית */
  ring?: boolean;
  className?: string;
}

/** תמונת הילד, או עיגול עם האות הראשונה בצבע האישי אם עוד אין תמונה */
export function Avatar({ child, size = 48, ring = false, className = '' }: Props) {
  const inner = child.photoURL ? (
    <img
      src={child.photoURL}
      alt={child.name}
      className="h-full w-full rounded-full object-cover"
      draggable={false}
    />
  ) : (
    <div
      className="flex h-full w-full items-center justify-center rounded-full font-display text-white"
      style={{
        background: `linear-gradient(155deg, ${child.themeColor}, ${child.themeColor}BF)`,
        fontSize: size * 0.4
      }}
      aria-label={child.name}
    >
      {child.name.charAt(0)}
    </div>
  );

  if (!ring) {
    return (
      <div className={`flex-shrink-0 ${className}`} style={{ width: size, height: size }}>
        {inner}
      </div>
    );
  }

  return (
    <div
      className={`flex-shrink-0 rounded-full p-[3px] ${className}`}
      style={{
        width: size,
        height: size,
        background: `conic-gradient(from 200deg, ${child.themeColor}, #E8C989, #8A9B76, ${child.themeColor})`,
        boxShadow: `0 12px 30px ${child.themeColor}40`
      }}
    >
      <div className="h-full w-full rounded-full bg-sand-50 p-[3px]">{inner}</div>
    </div>
  );
}
