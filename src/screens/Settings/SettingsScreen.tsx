import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Pencil, LogOut, CloudOff } from 'lucide-react';
import { db } from '@/db/schema';
import { auth } from '@/services/firebase/config';
import { signOut } from '@/services/auth/authService';
import { calculateCurrentAge } from '@/utils/ageCalculator';
import { AddChildForm } from '@/screens/Home/AddChildForm';
import type { Child } from '@/types';

export function SettingsScreen() {
  const [editingChild, setEditingChild] = useState<Child | null>(null);
  const [isAddingChild, setIsAddingChild] = useState(false);

  const children = useLiveQuery(() => db.children.toArray(), []);
  const pendingCount = useLiveQuery(() => db.syncQueue.count(), []);

  const user = auth.currentUser;

  return (
    <div className="min-h-screen pb-32 pt-6">
      <header className="animate-rise-in mb-6 px-6">
        <h1 className="font-display text-3xl text-ink">הגדרות</h1>
      </header>

      {/* ===== פרטי משתמש ===== */}
      <section className="animate-rise-in mx-6 mb-6 rounded-card border border-sand-200/70 bg-white p-5 shadow-warm">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-honey/15 text-lg font-display text-honey-dark">
            {(user?.displayName || user?.email || '?').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium text-ink">{user?.displayName || 'המשתמש שלי'}</p>
            <p className="truncate text-sm text-ink-soft">{user?.email}</p>
          </div>
        </div>
      </section>

      {/* ===== מצב סנכרון ===== */}
      {!!pendingCount && pendingCount > 0 && (
        <section className="animate-rise-in mx-6 mb-6 flex items-center gap-2 rounded-card border border-honey/30 bg-honey/10 p-4 text-sm text-honey-dark">
          <CloudOff size={18} />
          <span>{pendingCount} פריטים ממתינים לסנכרון עם הענן</span>
        </section>
      )}

      {/* ===== ניהול ילדים ===== */}
      <section className="animate-rise-in mx-6 mb-6">
        <div className="mb-2 flex items-center justify-between px-1">
          <p className="text-sm font-medium text-ink-soft">ילדים במסלול</p>
          <button
            onClick={() => setIsAddingChild(true)}
            className="flex items-center gap-1 rounded-full bg-honey/10 px-3 py-1.5 text-xs font-medium text-honey-dark transition hover:bg-honey/15"
          >
            <Plus size={14} /> הוספת ילד
          </button>
        </div>

        <div className="space-y-2">
          {children?.map((child) => (
            <div
              key={child.id}
              className="flex items-center gap-3 rounded-card border border-sand-200/70 bg-white p-4 shadow-warm"
            >
              <div
                className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full font-display text-white"
                style={{ background: child.themeColor }}
              >
                {child.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-ink">{child.name}</p>
                <p className="text-sm text-ink-soft">{calculateCurrentAge(child.birthDate).label}</p>
              </div>
              <button
                onClick={() => setEditingChild(child)}
                className="rounded-full p-2 text-ink-soft transition hover:bg-sand-100"
                aria-label={`עריכת ${child.name}`}
                title="עריכה / מחיקה"
              >
                <Pencil size={18} />
              </button>
            </div>
          ))}

          {children?.length === 0 && (
            <p className="rounded-card border border-dashed border-sand-300 bg-white/60 p-5 text-center text-sm text-ink-soft">
              עוד לא נוסף ילד למסלול
            </p>
          )}
        </div>
      </section>

      {/* ===== יציאה ===== */}
      <section className="animate-rise-in mx-6">
        <button
          onClick={() => signOut()}
          className="flex w-full items-center justify-center gap-2 rounded-card border border-sand-200/70 bg-white p-4 text-sm font-medium text-clay shadow-warm transition hover:bg-clay/5"
        >
          <LogOut size={16} /> התנתקות
        </button>
      </section>

      {isAddingChild && <AddChildForm onClose={() => setIsAddingChild(false)} />}
      {editingChild && (
        <AddChildForm child={editingChild} onClose={() => setEditingChild(null)} />
      )}
    </div>
  );
}
