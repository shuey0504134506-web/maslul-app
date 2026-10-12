import {
  Footprints,
  MessageCircle,
  Heart,
  GraduationCap,
  HeartPulse,
  Users,
  PartyPopper,
  Compass,
  Trophy,
  Smile,
  Star,
  type LucideIcon
} from 'lucide-react';
import type { MilestoneCategory } from '@/types';

/**
 * מקור אחד לשם, אייקון וצבע של כל קטגוריה - משמש את המסלול, החיפוש,
 * מסך הבית והטפסים, כך שהמראה זהה בכל מקום.
 */
export const CATEGORY_STYLE: Record<
  MilestoneCategory,
  { label: string; icon: LucideIcon; color: string }
> = {
  motor: { label: 'התפתחות מוטורית', icon: Footprints, color: '#8A9B76' },
  language: { label: 'שפה', icon: MessageCircle, color: '#C99A4B' },
  social: { label: 'חברה ורגש', icon: Heart, color: '#B97A5E' },
  education: { label: 'לימודים', icon: GraduationCap, color: '#6E8AA6' },
  health: { label: 'בריאות וגדילה', icon: HeartPulse, color: '#8A9B76' },
  family: { label: 'משפחה', icon: Users, color: '#B97A5E' },
  holidays: { label: 'חגים', icon: PartyPopper, color: '#C99A4B' },
  trips: { label: 'טיולים', icon: Compass, color: '#6E8AA6' },
  achievements: { label: 'הישגים', icon: Trophy, color: '#C99A4B' },
  funny: { label: 'דברים מצחיקים', icon: Smile, color: '#A98BC4' },
  special: { label: 'ציון דרך מיוחד', icon: Star, color: '#8A9B76' }
};

export const CATEGORY_LABELS = Object.fromEntries(
  Object.entries(CATEGORY_STYLE).map(([key, value]) => [key, value.label])
) as Record<MilestoneCategory, string>;
